import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import goongjs from "@goongmaps/goong-js";
import "@goongmaps/goong-js/dist/goong-js.css";
import { ChevronLeft, ChevronRight, Route } from "lucide-react";
import { orderWaypointsShortest } from "@/lib/mockItineraries";

const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY;
const HCMC_CENTER = [106.7009, 10.7769]; // [lng, lat] cho Goong/Mapbox

goongjs.accessToken = GOONG_MAPTILES_KEY;

// Tạo HTML cho numbered marker
const createMarkerElement = (index, isLast = false) => {
	const el = document.createElement("div");
	el.className = "goong-numbered-marker";
	el.style.cssText = `
		width: 32px; height: 32px; border-radius: 9999px;
		background: ${isLast ? "#dc2626" : "#2563eb"};
		border: 3px solid ${isLast ? "#fecaca" : "#bfdbfe"};
		color: ${isLast ? "#fff1f2" : "#eff6ff"};
		font-weight: 700; font-size: 13px;
		display: flex; align-items: center; justify-content: center;
		box-shadow: 0 3px 12px ${isLast ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)"};
		cursor: pointer; transition: transform 0.2s;
	`;
	el.textContent = index;
	el.onmouseenter = () => (el.style.transform = "scale(1.2)");
	el.onmouseleave = () => (el.style.transform = "scale(1)");
	return el;
};

// Tạo HTML cho marker mặc định (focus)
const createDefaultMarkerElement = () => {
	const el = document.createElement("div");
	el.style.cssText = `
		width: 24px; height: 36px; position: relative;
	`;
	el.innerHTML = `<svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#3b82f6"/>
		<circle cx="12" cy="12" r="5" fill="white"/>
	</svg>`;
	return el;
};

export default function MapView({
	focusedLocation,
	route,
	shortestPath,
	onShortestPathChange,
	onFocusLocation,
	recenterKey = 0,
}) {
	const mapContainerRef = useRef(null);
	const mapRef = useRef(null);
	const markersRef = useRef([]);
	const focusMarkerRef = useRef(null);
	const prevRecenterKeyRef = useRef(recenterKey);
	const [routePanelOpen, setRoutePanelOpen] = useState(true);
	const [mapStyle, setMapStyle] = useState("goong");

	// Định nghĩa các Style cho Goong SDK
	const MAP_STYLES = {
		goong: {
			label: "Goong Map",
			style: "https://tiles.goong.io/assets/goong_map_web.json",
		},
		satellite: {
			label: "Vệ tinh",
			style: {
				version: 8,
				sources: {
					"raster-tiles": {
						type: "raster",
						tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
						tileSize: 256,
						attribution: "Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
					},
				},
				layers: [{ id: "simple-tiles", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 22 }],
			},
		},
		osm: {
			label: "OpenStreetMap",
			style: {
				version: 8,
				sources: {
					"raster-tiles": {
						type: "raster",
						tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
						tileSize: 256,
						attribution: "&copy; OpenStreetMap contributors",
					},
				},
				layers: [{ id: "simple-tiles", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 22 }],
			},
		},
	};

	const ordered = useMemo(() => {
		const waypoints = route?.waypoints ?? [];
		if (!waypoints.length) return [];
		return shortestPath
			? orderWaypointsShortest(waypoints)
			: [...waypoints];
	}, [route, shortestPath]);

	const linePositions = useMemo(() => {
		if (route?.polyline && route.polyline.length >= 2) {
			// polyline format: [[lat, lng], ...] → cần đổi thành [[lng, lat], ...]
			return route.polyline.map((p) => [p[1], p[0]]);
		}
		return ordered.map((w) => [w.longitude, w.latitude]);
	}, [ordered, route]);

	// Khởi tạo bản đồ Goong
	useEffect(() => {
		if (mapRef.current) return;

		const map = new goongjs.Map({
			container: mapContainerRef.current,
			style: "https://tiles.goong.io/assets/goong_map_web.json",
			center: HCMC_CENTER,
			zoom: 13,
			minZoom: 10,
			maxBounds: [
				[106.3533, 10.3731],
				[107.0305, 11.1603],
			],
		});

		map.addControl(new goongjs.NavigationControl(), "bottom-right");
		mapRef.current = map;

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, []);

	// Xóa tất cả markers cũ
	const clearMarkers = useCallback(() => {
		markersRef.current.forEach((m) => m.remove());
		markersRef.current = [];
	}, []);

	// Vẽ route line + markers
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !map.isStyleLoaded()) {
			// Đợi style load xong
			const onLoad = () => {
				updateMapLayers();
				map.off("load", onLoad);
			};
			map?.on("load", onLoad);
			return;
		}
		updateMapLayers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ordered, linePositions, route]);

	const updateMapLayers = useCallback(() => {
		const map = mapRef.current;
		if (!map) return;

		// Xóa layers cũ
		["route-line-shadow", "route-line", "route-line-dash"].forEach((id) => {
			if (map.getLayer(id)) map.removeLayer(id);
		});
		if (map.getSource("route")) map.removeSource("route");
		clearMarkers();

		if (linePositions.length < 2) return;

		// Thêm GeoJSON source
		map.addSource("route", {
			type: "geojson",
			data: {
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: linePositions,
				},
			},
		});

		// Lớp 1: Viền bóng
		map.addLayer({
			id: "route-line-shadow",
			type: "line",
			source: "route",
			paint: {
				"line-color": "#ffffff",
				"line-width": 10,
				"line-opacity": 0.35,
			},
			layout: { "line-cap": "round", "line-join": "round" },
		});

		// Lớp 2: Đường chính
		map.addLayer({
			id: "route-line",
			type: "line",
			source: "route",
			paint: {
				"line-color": "#3b82f6",
				"line-width": 5,
				"line-opacity": 1,
			},
			layout: { "line-cap": "round", "line-join": "round" },
		});

		// Lớp 3: Đường nét đứt
		map.addLayer({
			id: "route-line-dash",
			type: "line",
			source: "route",
			paint: {
				"line-color": "#ffffff",
				"line-width": 2,
				"line-opacity": 0.7,
				"line-dasharray": [2, 4],
			},
			layout: { "line-cap": "round", "line-join": "round" },
		});

		// Thêm markers cho waypoints
		ordered.forEach((w, i) => {
			const isLast = i === ordered.length - 1;
			const el = createMarkerElement(i + 1, isLast);

			const popup = new goongjs.Popup({ offset: 20, closeButton: false }).setHTML(
				`<div style="font-size:13px;font-weight:600;padding:4px 8px;">${i + 1}. ${w.name}${isLast ? " (Điểm đến cuối)" : ""}</div>`
			);

			const marker = new goongjs.Marker({ element: el })
				.setLngLat([w.longitude, w.latitude])
				.setPopup(popup)
				.addTo(map);

			markersRef.current.push(marker);
		});

		// Fit bounds
		if (linePositions.length >= 2) {
			const bounds = linePositions.reduce(
				(b, coord) => b.extend(coord),
				new goongjs.LngLatBounds(linePositions[0], linePositions[0])
			);
			map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
		}
	}, [linePositions, ordered, clearMarkers]);

	// Focus location (khi chưa có route)
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		// Xóa focus marker cũ
		if (focusMarkerRef.current) {
			focusMarkerRef.current.remove();
			focusMarkerRef.current = null;
		}

		if (focusedLocation) {
			map.flyTo({
				center: [focusedLocation.longitude, focusedLocation.latitude],
				zoom: 16,
				duration: 800,
			});

			if (!route) {
				const el = createDefaultMarkerElement();
				const popup = new goongjs.Popup({ offset: 25, closeButton: false }).setHTML(
					`<div style="font-size:13px;font-weight:500;padding:4px 8px;">${focusedLocation.name}</div>`
				);
				focusMarkerRef.current = new goongjs.Marker({ element: el })
					.setLngLat([focusedLocation.longitude, focusedLocation.latitude])
					.setPopup(popup)
					.addTo(map);
			}
		}
	}, [focusedLocation, route]);

	// Recenter
	useEffect(() => {
		const map = mapRef.current;
		if (!map || recenterKey === prevRecenterKeyRef.current) return;
		prevRecenterKeyRef.current = recenterKey;

		if (linePositions.length >= 2) {
			const bounds = linePositions.reduce(
				(b, coord) => b.extend(coord),
				new goongjs.LngLatBounds(linePositions[0], linePositions[0])
			);
			map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
		}
	}, [recenterKey, linePositions]);

	// Default marker khi không có gì
	useEffect(() => {
		const map = mapRef.current;
		if (!map || route || focusedLocation) return;

		if (focusMarkerRef.current) {
			focusMarkerRef.current.remove();
			focusMarkerRef.current = null;
		}

		const popup = new goongjs.Popup({ offset: 25, closeButton: false }).setHTML(
			`<div style="font-size:13px;font-weight:500;padding:4px 8px;">Trung tâm TP.HCM</div>`
		);
		focusMarkerRef.current = new goongjs.Marker()
			.setLngLat(HCMC_CENTER)
			.setPopup(popup)
			.addTo(map);
	}, [route, focusedLocation]);

	return (
		<div className="w-full h-full z-0 relative">
			<div
				ref={mapContainerRef}
				className="w-full h-full"
				style={{ position: "absolute", top: 0, left: 0 }}
			/>

			{/* Nút chuyển đổi Style bản đồ */}
			<div className="absolute top-3 left-3 z-[1001] rounded-xl border border-slate-700 bg-slate-900/85 backdrop-blur px-2 py-2 flex gap-2">
				{Object.entries(MAP_STYLES).map(([key, cfg]) => {
					const active = mapStyle === key;
					return (
						<button
							key={key}
							type="button"
							onClick={() => {
								setMapStyle(key);
								if (mapRef.current) {
									mapRef.current.setStyle(cfg.style);
								}
							}}
							className={`px-3 py-1.5 text-xs rounded-md transition ${
								active
									? "bg-blue-600 text-white"
									: "bg-slate-800 text-slate-300 hover:bg-slate-700"
							}`}
						>
							{cfg.label}
						</button>
					);
				})}
			</div>

			{route && (
				<>
					<button
						type="button"
						onClick={() => setRoutePanelOpen((o) => !o)}
						className={`absolute top-1/2 -translate-y-1/2 z-[1002] 
	w-6 h-14 
	bg-slate-900/80 backdrop-blur-md 
	border border-slate-700 
	shadow-[0_0_15px_rgba(59,130,246,0.3)] 
	flex items-center justify-center 
	rounded-l-xl 
	transition-all duration-300 
	hover:bg-slate-800 text-slate-300`}
						style={{
							right: routePanelOpen ? "280px" : "0px",
						}}
					>
						{routePanelOpen ? (
							<ChevronRight size={20} />
						) : (
							<ChevronLeft size={20} />
						)}
					</button>

					<div
						className={`absolute top-0 right-0 z-[499] h-full w-[280px] bg-slate-950/90 backdrop-blur-xl border-l border-slate-800 text-slate-100 shadow-2xl transition-transform duration-300 ${
							routePanelOpen
								? "translate-x-0"
								: "translate-x-full"
						}`}
					>
						<div className="p-4 border-b border-slate-800 flex items-center gap-2">
							<Route
								className="text-blue-400 shrink-0"
								size={18}
							/>
							<div className="min-w-0">
								<p className="text-xs uppercase text-slate-500 tracking-wide">
									Lộ trình đang xem
								</p>
								<p className="text-sm font-semibold truncate">
									{route.label}
								</p>
							</div>
						</div>

						<ul className="overflow-y-auto max-h-[calc(100%-7rem)] py-2">
							{ordered.map((w, i) => (
								<li key={`${w.id ?? w.name}-p-${i}`}>
									<button
										type="button"
										onClick={() => onFocusLocation?.(w)}
										className="w-full text-left px-4 py-2.5 flex gap-3 hover:bg-slate-800/60 transition-colors"
									>
										<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/20 text-xs font-bold text-blue-300">
											{i + 1}
										</span>
										<span className="text-sm text-slate-200 leading-snug">
											{w.name}
										</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				</>
			)}
		</div>
	);
}
