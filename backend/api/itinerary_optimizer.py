"""
Module tối ưu hóa hành trình (Itinerary Optimizer).
Sử dụng Giải thuật Di truyền (Genetic Algorithm) kết hợp Trí tuệ nhân tạo (CLIP).
"""

import requests
import random
import numpy as np
import time

OSRM_BASE = "http://router.project-osrm.org"

# --- MAPPING VIỆT HÓA CATEGORY ---
CATEGORY_MAP = {
    "restaurant": "Nhà hàng",
    "cafe": "Quán cà phê",
    "pub": "Quán pub",
    "bar": "Quán bar",
    "museum": "Bảo tàng",
    "attraction": "Điểm tham quan",
    "viewpoint": "Điểm ngắm cảnh",
    "gallery": "Triển lãm nghệ thuật",
    "art_centre": "Trung tâm nghệ thuật",
    "place_of_worship": "Địa điểm văn hóa tâm linh",
    "theatre": "Nhà hát",
    "cinema": "Rạp chiếu phim",
    "monument": "Tượng đài/Di tích",
    "memorial": "Khu tưởng niệm",
    "park": "Công viên",
    "garden": "Vườn hoa/Cảnh quan",
    "mall": "Trung tâm thương mại",
    "historic": "Di tích lịch sử",
    "Place": "Địa điểm tham quan",
}

# --- OSRM UTILS ---

def osrm_table(points: list) -> list[list[float]] | None:
    if len(points) < 2: return None
    coords = ";".join(f"{p['longitude']},{p['latitude']}" for p in points)
    url = f"{OSRM_BASE}/table/v1/driving/{coords}?annotations=duration"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get("code") == "Ok": return data["durations"]
    except: pass
    return None

def osrm_route(ordered_points: list) -> dict | None:
    if len(ordered_points) < 2: return None
    coords = ";".join(f"{p['longitude']},{p['latitude']}" for p in ordered_points)
    url = f"{OSRM_BASE}/route/v1/driving/{coords}?overview=full&geometries=geojson"
    try:
        resp = requests.get(url, timeout=15)
        data = resp.json()
        if data.get("code") == "Ok" and data.get("routes"):
            route = data["routes"][0]
            geojson_coords = route["geometry"]["coordinates"]
            leaflet_coords = [[c[1], c[0]] for c in geojson_coords]
            return {
                "total_seconds": route["duration"],
                "total_meters": route["distance"],
                "geometry_coords": leaflet_coords,
            }
    except: pass
    return None

# --- GENETIC ALGORITHM OPTIMIZER ---

class GeneticOptimizer:
    def __init__(self, mandatory, candidates, time_matrix, all_points, max_bonus=3):
        self.mandatory = mandatory
        self.candidates = candidates
        self.time_matrix = np.array(time_matrix)
        self.all_points = all_points
        self.max_bonus = max_bonus
        self.point_to_idx = {str(p.get("poi_id") or p.get("id")): i for i, p in enumerate(all_points)}
        self.mandatory_indices = [self.point_to_idx[str(p.get("poi_id") or p.get("id"))] for p in mandatory]
        self.candidate_indices = [self.point_to_idx[str(p.get("poi_id") or p.get("id"))] for p in candidates]
        
        # Cố định điểm đầu và cuối từ danh sách mandatory
        self.start_idx = self.mandatory_indices[0] if self.mandatory_indices else None
        self.end_idx = self.mandatory_indices[-1] if len(self.mandatory_indices) > 1 else None
        self.middle_mandatory = self.mandatory_indices[1:-1] if len(self.mandatory_indices) > 2 else []

    def _calculate_fitness(self, chromosome):
        total_profit = 0
        total_time = 0
        for i, idx in enumerate(chromosome):
            total_profit += self.all_points[idx].get("similarity_score", 0.0)
            if i > 0:
                total_time += self.time_matrix[chromosome[i-1]][idx]
        time_penalty = total_time / 3600.0
        return (total_profit * 10) - time_penalty 

    def solve(self, generations=40, pop_size=50):
        if self.start_idx is None: return []
        
        population = []
        for _ in range(pop_size):
            num_bonus = random.randint(0, min(self.max_bonus, len(self.candidate_indices)))
            selected_bonus = random.sample(self.candidate_indices, num_bonus)
            
            # Xây dựng gene: [Start] + [Middle Mandatory + Bonus Shuffled] + [End]
            middle_pool = self.middle_mandatory + selected_bonus
            random.shuffle(middle_pool)
            
            gene = [self.start_idx] + middle_pool
            if self.end_idx is not None:
                gene.append(self.end_idx)
            
            population.append(gene)

        for _ in range(generations):
            scored_pop = [(self._calculate_fitness(c), c) for c in population]
            scored_pop.sort(key=lambda x: x[0], reverse=True)
            
            # Elitism: Giữ lại top 20%
            new_population = [c for s, c in scored_pop[:int(pop_size * 0.2)]]
            
            while len(new_population) < pop_size:
                p1, p2 = random.sample(new_population[:10], 2)
                
                # Crossover cho phần giữa (giữ nguyên đầu/cuối)
                # p1_mid = p1[1:-1] if self.end_idx is not None else p1[1:]
                # p2_mid = p2[1:-1] if self.end_idx is not None else p2[1:]
                
                if self.end_idx is not None:
                    child_middle = list(set(p1[1:-1]) | set(p2[1:-1]))
                else:
                    child_middle = list(set(p1[1:]) | set(p2[1:]))
                
                # Giới hạn số lượng điểm bonus
                max_middle_size = len(self.middle_mandatory) + self.max_bonus
                if len(child_middle) > max_middle_size:
                    child_middle = random.sample(child_middle, max_middle_size)
                
                # Đảm bảo các điểm mandatory ở giữa vẫn có mặt
                for m in self.middle_mandatory:
                    if m not in child_middle: child_middle.append(m)
                
                random.shuffle(child_middle)
                
                # Đột biến (Mutation)
                if random.random() < 0.1: random.shuffle(child_middle)
                
                new_gene = [self.start_idx] + child_middle
                if self.end_idx is not None:
                    new_gene.append(self.end_idx)
                
                new_population.append(new_gene)
            population = new_population

        best_gene = sorted([(self._calculate_fitness(c), c) for c in population], key=lambda x: x[0], reverse=True)[0][1]
        return [self.all_points[idx] for idx in best_gene]

# --- REASONING GENERATOR (EXPLAINABLE AI) ---

def _generate_ai_reason(route: list, prompt: str) -> str:
    """Sinh câu giải thích chuyên nghiệp từ nội dung địa điểm."""
    if not prompt:
        return "Lộ trình tối ưu hóa dựa trên các điểm bạn đã chọn để đảm bảo thời gian di chuyển ngắn nhất."

    # Tìm các điểm bonus có độ tương đồng cao nhất
    bonus_points = [p for p in route if p.get("similarity_score", 0) > 0.2]
    bonus_points.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)

    if not bonus_points:
        return f"Lộ trình được thiết kế tập trung tối đa vào các yêu cầu '{prompt}' thông qua trình tự sắp xếp các điểm dừng bạn đã chọn."

    top_p = bonus_points[0]
    # Việt hóa category
    raw_cat = top_p.get("category", "")
    category = CATEGORY_MAP.get(raw_cat, "địa danh")
    name = top_p.get("name")
    desc = top_p.get("description", "")
    
    # Một số mẫu câu chuyên nghiệp
    starters = [
        f"Để tối ưu hóa trải nghiệm '{prompt}' của bạn, hành trình này được AI tinh chỉnh đặc biệt.",
        f"Lộ trình này được cá nhân hóa mạnh mẽ để đáp ứng sở thích '{prompt}' mà bạn đã mô tả.",
        f"Chúng tôi đề xuất phương án này nhằm mang đến không gian đậm chất '{prompt}' nhất cho chuyến đi của bạn."
    ]
    
    reasons = [
        f"Điểm nhấn đáng chú ý là **{name}** - một {category.lower()} có phong cách rất phù hợp với gu của bạn.",
        f"Chúng tôi đã khéo léo chèn thêm **{name}** ({category.lower()}) vào hành trình, giúp bạn có thêm không gian tận hưởng không khí '{prompt}'.",
        f"Sự bổ sung **{name}** là chìa khóa của lộ trình này, vì đây là {category.lower()} nổi tiếng hứa hẹn mang lại cảm giác '{prompt}' đúng ý bạn."
    ]
    
    # Kết hợp thêm Description nếu có
    final_reason = f"{random.choice(starters)} {random.choice(reasons)}"
    if desc and len(desc) > 10:
        desc_snippet = desc[:100] + "..." if len(desc) > 100 else desc
        final_reason += f" Đặc biệt, nơi này còn được biết đến là {desc_snippet.lower()}"

    return final_reason

# --- OLD ENGINE ---

def _greedy_insertion_route(mandatory: list, candidates: list, time_matrix_full: list, all_points: list, max_bonus: int = 2) -> list:
    point_index = {str(p.get("id") or p.get("poi_id")): i for i, p in enumerate(all_points)}
    current_route = list(mandatory)
    for _ in range(max_bonus):
        if not candidates: break
        best_bonus, best_cost, best_pos, best_cand_idx = None, float("inf"), -1, -1
        for cand_idx, cand in enumerate(candidates):
            cand_key = str(cand.get("poi_id") or cand.get("id"))
            ci = point_index.get(cand_key); 
            if ci is None: continue
            for insert_pos in range(1, len(current_route)):
                pi = point_index.get(str(current_route[insert_pos-1].get("poi_id") or current_route[insert_pos-1].get("id")))
                ni = point_index.get(str(current_route[insert_pos].get("poi_id") or current_route[insert_pos].get("id")))
                if pi is None or ni is None: continue
                try:
                    cost = time_matrix_full[pi][ci] + time_matrix_full[ci][ni] - time_matrix_full[pi][ni]
                    if cost < best_cost:
                        best_cost, best_bonus, best_pos, best_cand_idx = cost, cand, insert_pos, cand_idx
                except: continue
        if best_bonus:
            current_route.insert(best_pos, best_bonus)
            candidates.pop(best_cand_idx)
    return current_route

def format_duration(seconds: float) -> str:
    minutes = round(seconds / 60)
    if minutes < 60: return f"{minutes} phút"
    return f"{minutes // 60}h{minutes % 60:02d}p"

def build_top3_routes(mandatory_stops: list, bonus_candidates: list, prompt_text: str = "") -> list:
    if len(mandatory_stops) < 1: return []
    
    # Chuẩn bị dữ liệu
    all_start = time.time()
    top_bonus = bonus_candidates[:20] # Lấy rộng hơn để phân loại
    for i, b in enumerate(top_bonus):
        if "id" not in b: b["id"] = b.get("poi_id", f"bonus_{i}")
    
    all_points = mandatory_stops + top_bonus
    
    print(f"\n[Optimizer] --- Bắt đầu tính toán lộ trình ---")
    t_osrm_table_start = time.time()
    time_matrix = osrm_table(all_points)
    print(f"[Optimizer] 1. OSRM Table Matrix: {round(time.time() - t_osrm_table_start, 3)}s")
    
    routes = []

    # --- CHẾ ĐỘ 1: TỐI ƯU HÀNH TRÌNH ĐÃ CHỌN (>= 2 điểm) ---
    if len(mandatory_stops) >= 2:
        t0 = time.time()
        r0_geo = osrm_route(mandatory_stops)
        print(f"[Optimizer] 2. Route Gốc (OSRM): {round(time.time() - t0, 3)}s")

        routes.append({
            "id": "route_default",
            "label": "Lộ trình gốc",
            "theme": "default",
            "description": "Giữ nguyên thứ tự các điểm dừng bạn đã chọn.",
            "ai_reason": "Đây là hành trình theo đúng trình tự sắp xếp thủ công của bạn.",
            "waypoints": [{**s, "is_mandatory": True} for s in mandatory_stops],
            "polyline": r0_geo["geometry_coords"] if r0_geo else None,
            "duration_text": format_duration(r0_geo["total_seconds"]) if r0_geo else "N/A",
            "total_stops": len(mandatory_stops),
        })
        
        if not time_matrix: return routes

        # --- Route 1: TỐI ƯU THỜI GIAN ---
        t1_start = time.time()
        optimizer_r1 = GeneticOptimizer(mandatory_stops, [], time_matrix, all_points, max_bonus=0)
        r1_waypoints = optimizer_r1.solve()
        t1_ga = time.time()
        r1_geo = osrm_route(r1_waypoints)
        print(f"[Optimizer] 3. Route Fast: {round(t1_ga - t1_start, 3)}s (GA) + {round(time.time() - t1_ga, 3)}s (OSRM)")

        routes.append({
            "id": "route_fast",
            "label": "Tối ưu thời gian",
            "theme": "fast",
            "description": "Tìm trình tự di chuyển ngắn nhất giữa các điểm bạn đã chọn.",
            "ai_reason": "Hệ thống đã tính toán lại trình tự di chuyển để giảm thiểu thời gian ngồi trên xe.",
            "waypoints": [{**s, "is_mandatory": True} for s in r1_waypoints],
            "polyline": r1_geo["geometry_coords"] if r1_geo else None,
            "duration_text": format_duration(r1_geo["total_seconds"]) if r1_geo else "N/A",
            "total_stops": len(r1_waypoints),
        })
        
        if top_bonus:
            # --- Route 2: AI GỢI Ý (Khám phá) ---
            t2_start = time.time()
            optimizer_r2 = GeneticOptimizer(mandatory_stops, top_bonus[:10], time_matrix, all_points, max_bonus=3)
            r2_waypoints = optimizer_r2.solve()
            t2_ga = time.time()
            if r2_waypoints:
                r2_geo = osrm_route(r2_waypoints)
                print(f"[Optimizer] 4. Route Discovery: {round(t2_ga - t2_start, 3)}s (GA) + {round(time.time() - t2_ga, 3)}s (OSRM)")
                routes.append({
                    "id": "route_thematic",
                    "label": "AI Gợi ý (Khám phá)",
                    "theme": "thematic",
                    "description": "Thêm các địa điểm mới lạ phù hợp với nhu cầu của bạn.",
                    "ai_reason": _generate_ai_reason(r2_waypoints, prompt_text),
                    "waypoints": [{**w, "is_mandatory": any((str(m.get('id') or m.get('poi_id')) == str(w.get('id') or w.get('poi_id'))) for m in mandatory_stops)} for w in r2_waypoints],
                    "polyline": r2_geo["geometry_coords"] if r2_geo else None,
                    "duration_text": format_duration(r2_geo["total_seconds"]) if r2_geo else "N/A",
                    "total_stops": len(r2_waypoints),
                })
    
    # --- CHẾ ĐỘ 2: GỢI Ý Ý TƯỞNG (Chỉ có 1 điểm bắt đầu) ---
    else:
        print(f"[ItineraryOptimizer] Intent-driven mode active for prompt: {prompt_text}")
        if not time_matrix or not top_bonus:
            # Fallback nếu không có gợi ý
            r0_geo = osrm_route(mandatory_stops)
            routes.append({
                "id": "route_default",
                "label": "Điểm xuất phát",
                "theme": "default",
                "waypoints": [{**s, "is_mandatory": True} for s in mandatory_stops],
                "polyline": None,
                "duration_text": "0 phút",
            })
            return routes

        # Phân loại Bonus Candidates
        culinary_cands = [p for p in top_bonus if p.get('category') in ['restaurant', 'cafe', 'bar', 'pub']]
        activity_cands = [p for p in top_bonus if p.get('category') in ['museum', 'attraction', 'viewpoint', 'park', 'cinema', 'mall']]
        
        # 1. Route Tinh túy (Best Similarity)
        opt1 = GeneticOptimizer(mandatory_stops, top_bonus[:8], time_matrix, all_points, max_bonus=2)
        w1 = opt1.solve()
        g1 = osrm_route(w1)
        routes.append({
            "id": "route_best_match",
            "label": "Gợi ý: Tinh túy nhất",
            "theme": "thematic",
            "description": "Các địa điểm có độ tương đồng cao nhất với yêu cầu của bạn.",
            "ai_reason": _generate_ai_reason(w1, prompt_text),
            "waypoints": [{**w, "is_mandatory": i==0} for i, w in enumerate(w1)],
            "polyline": g1["geometry_coords"] if g1 else None,
            "duration_text": format_duration(g1["total_seconds"]) if g1 else "N/A",
            "total_stops": len(w1),
        })

        # 2. Route Ẩm thực & Thư giãn
        cands2 = culinary_cands[:10] if culinary_cands else top_bonus[:10]
        opt2 = GeneticOptimizer(mandatory_stops, cands2, time_matrix, all_points, max_bonus=3)
        w2 = opt2.solve()
        g2 = osrm_route(w2)
        routes.append({
            "id": "route_culinary",
            "label": "Gợi ý: Ẩm thực & Thư giãn",
            "theme": "balanced",
            "description": "Tập trung vào các trải nghiệm ăn uống và không gian thoải mái.",
            "ai_reason": f"Vì bạn muốn '{prompt_text}', chúng tôi ưu tiên các nhà hàng và quán cafe có phong cách phù hợp.",
            "waypoints": [{**w, "is_mandatory": i==0} for i, w in enumerate(w2)],
            "polyline": g2["geometry_coords"] if g2 else None,
            "duration_text": format_duration(g2["total_seconds"]) if g2 else "N/A",
            "total_stops": len(w2),
        })

        # 3. Route Khám phá & Trải nghiệm
        t_proposal_start = time.time()
        cands3 = activity_cands[:10] if activity_cands else top_bonus[5:15]
        opt3 = GeneticOptimizer(mandatory_stops, cands3, time_matrix, all_points, max_bonus=3)
        w3 = opt3.solve()
        g3 = osrm_route(w3)
        print(f"[Optimizer] Proposal Mode complete: {round(time.time() - t_proposal_start, 3)}s total for 3 routes.")
        routes.append({
            "id": "route_activity",
            "label": "Gợi ý: Khám phá & Trải nghiệm",
            "theme": "fast",
            "description": "Hành trình bao gồm các hoạt động vui chơi và tham quan đặc sắc.",
            "ai_reason": "Dựa trên nhu cầu của bạn, đây là lộ trình kết hợp giữa tham quan và vận động nhẹ nhàng.",
            "waypoints": [{**w, "is_mandatory": i==0} for i, w in enumerate(w3)],
            "polyline": g3["geometry_coords"] if g3 else None,
            "duration_text": format_duration(g3["total_seconds"]) if g3 else "N/A",
            "total_stops": len(w3),
        })

    return routes
