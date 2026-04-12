import json
import os
import requests
import time
from icrawler.builtin import BingImageCrawler

# --- CẤU HÌNH ---
# Tọa độ giới hạn của Quận 1, TP.HCM (Bounding Box)
BBOX = "10.760,106.685,10.785,106.710"
IMAGE_LIMIT = 3 # Số ảnh mỗi địa điểm
POI_LIMIT = 50  # Tôi để tạm 50 để chạy thử nhanh, bạn có thể sửa thành 150
OUTPUT_JSON = 'database/pois_auto_v2.json'
IMAGE_BASE_DIR = 'frontend/public/assets/images/locations'

def get_pois_from_osm():
    print(f"--- 1. Đang dò tìm địa điểm tại Quận 1 từ OpenStreetMap... ---")
    # Query lấy cafe, restaurant, tourism (điểm tham quan)
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"cafe|restaurant"]({BBOX});
      node["tourism"~"attraction|museum|viewpoint"]({BBOX});
    );
    out body {POI_LIMIT};
    """
    response = requests.get(overpass_url, params={'data': overpass_query})
    data = response.json()
    
    raw_elements = data.get('elements', [])
    print(f"Tìm thấy {len(raw_elements)} địa điểm tiềm năng.")
    
    pois = []
    for idx, el in enumerate(raw_elements):
        name = el.get('tags', {}).get('name')
        if not name: continue  # Bỏ qua nếu không có tên
            
        pois.append({
            "id": idx + 1,
            "name": name,
            "latitude": el.get('lat'),
            "longitude": el.get('lon'),
            "category": el.get('tags', {}).get('amenity') or el.get('tags', {}).get('tourism') or "Place"
        })
    return pois

def download_images_and_build_json(pois):
    print(f"\n--- 2. Bắt đầu săn ảnh và xây dựng file JSON ---")
    if not os.path.exists(IMAGE_BASE_DIR):
        os.makedirs(IMAGE_BASE_DIR, exist_ok=True)

    enriched_data = []
    
    for poi in pois:
        poi_id = poi['id']
        poi_name = poi['name']
        print(f"\n>> Đang xử lý [{poi_id}]: {poi_name}")
        
        save_path = os.path.join(IMAGE_BASE_DIR, str(poi_id))
        os.makedirs(save_path, exist_ok=True)
        
        # Săn ảnh
        try:
            crawler = BingImageCrawler(storage={'root_dir': save_path}, log_level=50) # Tắt log rác
            crawler.crawl(keyword=f"{poi_name} Sài Gòn Quận 1", max_num=IMAGE_LIMIT)
            
            # Lọc file ảnh thực tế
            files = [f for f in os.listdir(save_path) if f.endswith(('.jpg', '.jpeg', '.png'))]
            files.sort()
            
            # Build đường dẫn so với server (Frontend public)
            img_list = [f"/assets/images/locations/{poi_id}/{f}" for f in files]
            
            poi['image_list'] = img_list
            poi['image'] = img_list[0] if img_list else ""
            enriched_data.append(poi)
            
        except Exception as e:
            print(f"Lỗi khi tải ảnh cho {poi_name}: {e}")

    # Ghi file JSON cuối cùng
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(enriched_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ HOÀN THÀNH!")
    print(f"Tổng cộng: {len(enriched_data)} địa điểm đã được 'AI hóa'.")
    print(f"File kết quả: {OUTPUT_JSON}")

if __name__ == "__main__":
    start_time = time.time()
    pois_list = get_pois_from_osm()
    if pois_list:
        download_images_and_build_json(pois_list)
    
    end_time = time.time()
    print(f"Thời gian thực hiện: {round(end_time - start_time, 2)} giây.")
