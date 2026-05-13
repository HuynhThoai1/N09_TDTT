import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import goongjs from "@goongmaps/goong-js";
import "@goongmaps/goong-js/dist/goong-js.css";
import { ChevronLeft, ChevronRight, Route, Search, X, Trash2, LocateFixed, Info, Loader2 } from "lucide-react";


const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY;
const HCMC_CENTER = [106.7009, 10.7769]; // [lng, lat] cho Goong/Mapbox

goongjs.accessToken = import.meta.env.VITE_GOONG_MAP_KEY;

// const goongApiKey = import.meta.env.VITE_GOONG_API_KEY;

// Tạo HTML cho numbered marker
const createMarkerElement = (index, isLast = false) => {
	// outer container: map positions this element by setting its transform.
	// avoid changing `el.style.transform` because the map controls it —
	// instead put visuals into `inner` and scale the inner element on hover.
	const el = document.createElement("div");
	el.className = "goong-numbered-marker";
	el.style.cssText = `
		display: inline-block; /* keep a wrapper only */
		line-height: 0;
	`;

	const inner = document.createElement("div");
	inner.style.cssText = `
		width: 32px; height: 32px; border-radius: 9999px;
		background: ${isLast ? "#dc2626" : "#2563eb"};
		border: 3px solid ${isLast ? "#fecaca" : "#bfdbfe"};
		color: ${isLast ? "#fff1f2" : "#eff6ff"};
		font-weight: 700; font-size: 13px;
		display: flex; align-items: center; justify-content: center;
		box-shadow: 0 3px 12px ${isLast ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)"};
		cursor: pointer; transition: transform 0.15s ease;
		transform-origin: center center;
		transform: scale(1);
	`;
	inner.textContent = index;

	// scale only the inner visual element — map keeps positioning outer `el`
	inner.addEventListener("mouseenter", () => (inner.style.transform = "scale(1.18)"));
	inner.addEventListener("mouseleave", () => (inner.style.transform = "scale(1)"));

	el.appendChild(inner);
	return el;
};

// Tạo HTML cho marker mặc định (focus)
const createDefaultMarkerElement = (color = "#3b82f6") => {
	const el = document.createElement("div");
	// Không dùng cssText để tránh ghi đè thuộc tính định vị của GoongJS
	el.style.width = "40px";
	el.style.height = "40px";
	el.style.display = "flex";
	el.style.alignItems = "center";
	el.style.justifyContent = "center";
	el.style.cursor = "pointer";

	if (!document.getElementById("marker-pulse-style")) {
		const style = document.createElement("style");
		style.id = "marker-pulse-style";
		style.innerHTML = `
			@keyframes markerPulse {
				0% { transform: scale(1); opacity: 0.8; }
				100% { transform: scale(3.5); opacity: 0; }
			}
			.pulse-ring {
				position: absolute;
				width: 100%;
				height: 100%;
				border-radius: 50%;
				animation: markerPulse 1.5s ease-out infinite;
				z-index: 1;
			}
			.pin-icon {
				position: relative;
				z-index: 2;
				filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
			}
		`;
		document.head.appendChild(style);
	}

	el.innerHTML = `
		<div class="pulse-ring" style="background-color: ${color}"></div>
		<div class="pin-icon">
			<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${color}" stroke="white" stroke-width="1.5"/>
			</svg>
		</div>
	`;

	return el;
};

export default function MapView({
	focusedLocation,
	route,
	shortestPath,
	onShortestPathChange,
	onFocusLocation,
	onDetailLocationChange,
	onOptimizeRoute,
	isRecalculatingRoute = false,
	recenterKey = 0,
}) {
	const mapContainerRef = useRef(null);
	const mapRef = useRef(null);
	const markersRef = useRef([]);
	const focusMarkerRef = useRef(null);
	const prevRecenterKeyRef = useRef(recenterKey);
	const [routePanelOpen, setRoutePanelOpen] = useState(true);
	const [mapStyle, setMapStyle] = useState("goong");

	// Drag & drop state for reordering suggested stops
	const [dragIndex, setDragIndex] = useState(null);
	const [dragOverIndex, setDragOverIndex] = useState(null);

	// Search state for adding new waypoints
	const [searchTerm, setSearchTerm] = useState("");
	const [searchSuggestions, setSearchSuggestions] = useState([]);
	const [isSearching, setIsSearching] = useState(false);
	const [actionNotice, setActionNotice] = useState(null);

	const showActionNotice = useCallback((type, message) => {
		setActionNotice({ type, message });
	}, []);

	// Helper: get API base URL
	const getApiBase = () => {
		if (typeof window === "undefined") return "http://localhost:8000";
		return `${window.location.protocol}//${window.location.hostname}:8000`;
	};

	// Search waypoint locations
	const handleSearchLocation = useCallback(async (term) => {
		if (!term.trim()) {
			setSearchSuggestions([]);
			return;
		}
		setIsSearching(true);
		try {
			const response = await fetch(
				`${getApiBase()}/api/goong/autocomplete/?input=${encodeURIComponent(term)}`
			);
			if (response.ok) {
				const data = await response.json();
				const mapped = (data.predictions || []).map((p) => ({
					id: p.place_id,
					poi_id: p.place_id,
					name: p.description,
					address: p.compound?.address || p.description,
					is_goong_place: true,
				}));
				setSearchSuggestions(mapped);
			}
		} catch (error) {
			console.error("Search error:", error);
		} finally {
			setIsSearching(false);
		}
	}, [getApiBase]);

	// Add waypoint to route
	const handleAddWaypoint = useCallback(async (loc) => {
		if (!route) return;
		try {
			// Get detailed location if needed
			let finalLoc = loc;
			if (loc.is_goong_place) {
				const response = await fetch(
					`${getApiBase()}/api/goong/place-detail/?place_id=${loc.poi_id}`
				);
				if (response.ok) {
					const detail = await response.json();
					const result = detail.result;
					finalLoc = {
						...loc,
						latitude: result.geometry.location.lat,
						longitude: result.geometry.location.lng,
						name: result.name,
						address: result.formatted_address,
					};
				}
			}
			// Add to waypoints (before last waypoint)
			const newWaypoints = [...route.waypoints];
			newWaypoints.splice(newWaypoints.length - 1, 0, finalLoc);
			const recalcOk = await onShortestPathChange?.(newWaypoints);
			if (recalcOk === false) {
				showActionNotice("error", "Thêm địa điểm thành công nhưng cập nhật đường đi thất bại.");
			} else {
				showActionNotice("success", "Đã thêm địa điểm và cập nhật lộ trình.");
			}
			setSearchTerm("");
			setSearchSuggestions([]);
		} catch (error) {
			console.error("Add waypoint error:", error);
			showActionNotice("error", "Không thể thêm địa điểm vào lộ trình.");
		}
	}, [route, onShortestPathChange, getApiBase, showActionNotice]);

	// Remove waypoint from route (cannot remove first or last)
	const handleRemoveWaypoint = useCallback(
		async (index) => {
			if (!route || index === 0 || index === route.waypoints.length - 1) return;
			const newWaypoints = route.waypoints.filter((_, i) => i !== index);
			const recalcOk = await onShortestPathChange?.(newWaypoints);
			if (recalcOk === false) {
				showActionNotice("error", "Xóa địa điểm thành công nhưng cập nhật đường đi thất bại.");
			} else {
				showActionNotice("success", "Đã xóa địa điểm và cập nhật lộ trình.");
			}
		},
		[route, onShortestPathChange, showActionNotice]
	);

	const handleLocateWaypoint = useCallback(
		(waypoint, index) => {
			const map = mapRef.current;
			if (!map) return;
			map.flyTo({
				center: [waypoint.longitude, waypoint.latitude],
				zoom: 16,
				duration: 800,
			});
			onFocusLocation?.(waypoint);

			const marker = markersRef.current[index];
			if (marker?.togglePopup) marker.togglePopup();
		},
		[onFocusLocation]
	);

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
		return [...waypoints];
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
			minZoom: 2,
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

			const marker = new goongjs.Marker({ element: el, anchor: "center" })
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
			// Hỗ trợ cả 2 định dạng tên thuộc tính tọa độ (lat/lng và latitude/longitude)
			const lng = focusedLocation.longitude !== undefined ? focusedLocation.longitude : focusedLocation.lng;
			const lat = focusedLocation.latitude !== undefined ? focusedLocation.latitude : focusedLocation.lat;

			if (lng === undefined || lat === undefined) return;

			const target = [lng, lat];
			const currentCenter = map.getCenter();
		
			// Tính khoảng cách tương đối (theo độ)
			const dLat = lat - currentCenter.lat;
			const dLng = lng - currentCenter.lng;
			const distance = Math.sqrt(dLat * dLat + dLng * dLng);

			// Nếu xa hơn khoảng ~22km (0.2 độ), nhảy thẳng để tránh lỗi. Nếu gần thì flyTo cho mượt.
			if (distance > 0.2) {
				map.jumpTo({
					center: target,
					zoom: 15,
				});
			} else {
				map.flyTo({
					center: target,
					zoom: 15,
					duration: 1200,
				});
			}

			// Luôn hiển thị marker khi có focusLocation để người dùng biết bản đồ đã nhảy đến đâu
			// Nếu đang tìm kiếm (preview) thì hiện màu đỏ, nếu đã chọn thì hiện màu xanh
			const markerColor = focusedLocation.isSearching ? "#ef4444" : "#3b82f6";
			const el = createDefaultMarkerElement(markerColor);
			
			const popupName = focusedLocation.name || focusedLocation.address || "Vị trí đã chọn";
			const popup = new goongjs.Popup({ offset: 25, closeButton: false }).setHTML(
				`<div style="font-size:13px;font-weight:500;padding:4px 8px;">${popupName}</div>`
			);
			
			focusMarkerRef.current = new goongjs.Marker({ element: el })
				.setLngLat(target)
				.setPopup(popup)
				.addTo(map);
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

	useEffect(() => {
		if (!actionNotice) return;
		const timeoutId = setTimeout(() => {
			setActionNotice(null);
		}, 2800);
		return () => clearTimeout(timeoutId);
	}, [actionNotice]);

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
							<div className="ml-auto flex items-center gap-2">
								<button
									type="button"
									disabled={isRecalculatingRoute}
									onClick={async () => {
										if (!onOptimizeRoute) return;
										const ok = await onOptimizeRoute();
										if (ok) {
											showActionNotice("success", "Tối ưu lộ trình thành công.");
										} else {
											showActionNotice("error", "Tối ưu lộ trình thất bại.");
										}
									}}
									className="px-3 py-1.5 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
								>
									Tối ưu lộ trình
								</button>
							</div>
						</div>

						{/* Search box to add new waypoint */}
						<div className="p-3 border-b border-slate-800 space-y-2">
							<label className="text-xs uppercase text-slate-500 tracking-wider block">
								Thêm địa điểm
							</label>
							{isRecalculatingRoute && (
								<div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-[11px] text-blue-200">
									<Loader2 size={12} className="animate-spin" />
									<span>Đang tính toán lại lộ trình...</span>
								</div>
							)}
							{actionNotice && (
								<div
									className={`rounded-md px-2 py-1.5 text-[11px] border ${
										actionNotice.type === "success"
											? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
											: "border-red-500/30 bg-red-500/10 text-red-200"
									}`}
								>
									{actionNotice.message}
								</div>
							)}
							<div className="relative">
								<Search
									className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
									size={14}
								/>
								<input
									type="text"
									placeholder="Tìm địa điểm..."
									value={searchTerm}
									disabled={isRecalculatingRoute}
									onChange={(e) => {
										const val = e.target.value;
										setSearchTerm(val);
										handleSearchLocation(val);
									}}
									className="w-full pl-10 pr-8 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
								{searchTerm && (
									<button
										type="button"
										onClick={() => {
											setSearchTerm("");
											setSearchSuggestions([]);
										}}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
									>
										<X size={14} />
									</button>
								)}
							</div>
							{searchSuggestions.length > 0 && (
								<div className="max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded space-y-1 p-1">
									{searchSuggestions.map((loc) => (
										<button
											key={loc.id}
											type="button"
											disabled={isRecalculatingRoute}
											onClick={() => handleAddWaypoint(loc)}
											className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-200 transition-colors"
										>
											{loc.name}
										</button>
									))}
								</div>
							)}
						</div>

						<ul className="overflow-y-auto max-h-[calc(100%-11rem)] py-2">
							{ordered.map((w, i) => {
								const isDragging = dragIndex === i;
								const isDragOver = dragOverIndex === i;
								const isFirstStop = i === 0; // First stop is locked
								const isLastStop = i === ordered.length - 1; // Cannot delete last stop
								return (
									<li
										key={`${w.id ?? w.name}-p-${i}`}
										draggable={!isFirstStop && !isRecalculatingRoute}
										onDragStart={(e) => {
											if (isRecalculatingRoute) return;
											if (isFirstStop) return; // Prevent drag start for first stop
											setDragIndex(i);
											e.dataTransfer?.setData("text/plain", "");
											e.dataTransfer.effectAllowed = "move";
										}}
										onDragOver={(e) => {
											if (isRecalculatingRoute) return;
											if (isFirstStop) return; // Prevent dropping on first stop
											e.preventDefault();
											setDragOverIndex(i);
										}}
										onDrop={async (e) => {
											if (isRecalculatingRoute) return;
											e.preventDefault();
											if (dragIndex === null || dragIndex === 0 || i === 0) return; // Prevent moving first stop
											const newOrder = [...ordered];
											const [moved] = newOrder.splice(dragIndex, 1);
											newOrder.splice(i, 0, moved);
											setDragIndex(null);
											setDragOverIndex(null);
											// notify parent about new order (if callback provided)
											const recalcOk = await onShortestPathChange?.(newOrder);
											if (recalcOk === false) {
												showActionNotice("error", "Đã sắp xếp lại điểm dừng nhưng cập nhật đường đi thất bại.");
											} else {
												showActionNotice("success", "Đã sắp xếp lại điểm dừng và cập nhật lộ trình.");
											}
										}}
										onDragEnd={() => {
											setDragIndex(null);
											setDragOverIndex(null);
										}}
									>
										<div
											className={`w-full px-4 py-2.5 flex gap-2 justify-between items-center transition-colors ${isFirstStop ? "cursor-not-allowed opacity-75" : "cursor-move"} ${isDragOver ? "bg-slate-800/60" : "hover:bg-slate-800/60"} ${isDragging ? "opacity-60" : ""}`}
										>
											<button
												type="button"
												onClick={() => handleLocateWaypoint(w, i)}
												className="flex gap-3 flex-1 min-w-0 text-left"
											>
												<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/20 text-xs font-bold text-blue-300">
													{i + 1}
												</span>
												<span className="text-sm text-slate-200 leading-snug truncate">
													{w.name} {isFirstStop && "(Cố định)"}
												</span>
											</button>
											<div className="flex items-center gap-1">
												<button
													type="button"
													disabled={isRecalculatingRoute}
													onClick={() => handleLocateWaypoint(w, i)}
													className="flex-shrink-0 p-1 text-slate-400 hover:text-blue-300 hover:bg-slate-800/50 rounded transition-colors"
													title="Định vị trên bản đồ"
												>
													<LocateFixed size={15} />
												</button>
												<button
													type="button"
													disabled={isRecalculatingRoute}
													onClick={() => {
														onDetailLocationChange?.(w);
														onFocusLocation?.(w);
													}}
													className="flex-shrink-0 p-1 rounded transition-colors text-slate-400 hover:text-blue-300 hover:bg-slate-800/50"
													title="Xem chi tiết"
												>
													<Info size={15} />
												</button>
												{!isFirstStop && !isLastStop && (
													<button
														type="button"
														disabled={isRecalculatingRoute}
														onClick={() => handleRemoveWaypoint(i)}
														className="flex-shrink-0 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800/50 rounded transition-colors"
														title="Xoá địa điểm"
													>
														<Trash2 size={16} />
													</button>
												)}
											</div>
										</div>
									</li>
								);
								})}
						</ul>
					</div>
				</>
			)}
		</div>
	);
}
