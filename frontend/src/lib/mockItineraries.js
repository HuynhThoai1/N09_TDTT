import { findLocationById } from "@/data/locations";

function byId(...ids) {
	return ids.map((id) => findLocationById(id)).filter(Boolean);
}

/**
 * Sinh 3 lộ trình giả lập dựa trên điểm dừng + mục tiêu + ngữ cảnh (chỉ FE).
 */
export function buildMockItinerarySuggestions(stops, goalText) {
	const seed = stops.length
		? stops.map((s) => s.name).join(" · ")
		: "khám phá trung tâm";
	const goalHint =
		(goalText || "").trim().slice(0, 80) || "tham quan văn hóa, ẩm thực";

	const routes = [
		{
			id: "r1",
			label: "Di sản & không gian xanh",
			totalDuration: "≈ 3h15",
			totalDistance: "4,8 km (ước lượng)",
			whyInteresting:
				"Nối các công trình lịch sử với công viên — vừa đi bộ thư giãn vừa có nhiều góc chụp và quán nước ven đường.",
			timeAndTips:
				"Ưu tiên sáng mát: Bảo tàng ~45′, sau đó cà phê ngắn rồi vào công viên nghỉ 20–30′.",
			waypointIds: [6, 4, 5, 2],
		},
		{
			id: "r2",
			label: "Kịch bản nghệ thuật phố",
			totalDuration: "≈ 2h40",
			totalDistance: "3,1 km (ước lượng)",
			whyInteresting:
				"Điểm nhấn là hẻm bích họa và bảo tàng mỹ thuật — hợp nếu bạn muốn góc ‘đậm chất Sài Gòn’.",
			timeAndTips:
				"Chiều muộn đẹp cho hẻm; bảo tàng nên ghé trước 17h. Giày đi bộ thoải mái.",
			waypointIds: [8, 3, 1, 4],
		},
		{
			id: "r3",
			label: "Trục lịch sử cô đọng",
			totalDuration: "≈ 2h55",
			totalDistance: "3,9 km (ước lượng)",
			whyInteresting:
				"Nhà thờ – chợ – Dinh: một đường thẳng cảm giác ‘grand tour’ quận 1, kể chuyện dễ theo dõi.",
			timeAndTips:
				"Nên ăn nhẹ ở khu chợ trước khi tới Dinh; tránh giờ nắng gắt trưa 11h–14h.",
			waypointIds: [1, 2, 7, 6],
		},
	];

	return routes.map((r) => {
		let waypoints = byId(...r.waypointIds);
		if (stops.length) {
			const merged = [...stops.map((s) => ({ ...s })), ...waypoints];
			const seen = new Set();
			waypoints = merged.filter((w) => {
				const k = w.id ?? `${w.lat},${w.lng}`;
				if (seen.has(k)) return false;
				seen.add(k);
				return true;
			});
		}
		return {
			...r,
			waypoints,
			mockMeta: {
				seed,
				goalHint,
			},
		};
	});
}

/** Greedy nearest-neighbor từ điểm đầu — giả lập ‘đường ngắn’ trên bản đồ. */
export function orderWaypointsShortest(waypoints) {
	if (!waypoints?.length) return [];
	const rest = waypoints.map((w) => ({ ...w }));
	const ordered = [rest.shift()];
	while (rest.length) {
		const last = ordered[ordered.length - 1];
		let bestI = 0;
		let bestD = Infinity;
		for (let i = 0; i < rest.length; i++) {
			const p = rest[i];
			const d = (p.lat - last.lat) ** 2 + (p.lng - last.lng) ** 2;
			if (d < bestD) {
				bestD = d;
				bestI = i;
			}
		}
		ordered.push(rest.splice(bestI, 1)[0]);
	}
	return ordered;
}
