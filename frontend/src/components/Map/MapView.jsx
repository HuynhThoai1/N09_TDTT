import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	Polyline,
	useMap,
	ZoomControl,
} from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ChevronLeft, ChevronRight, Route } from "lucide-react";
import { orderWaypointsShortest } from "@/lib/mockItineraries";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
	iconUrl: icon,
	shadowUrl: iconShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const createNumberedMarkerIcon = (index) =>
	L.divIcon({
		className: "numbered-marker-wrapper",
		html: `<div style="width:28px;height:28px;border-radius:9999px;background:#2563eb;border:2px solid #bfdbfe;color:#eff6ff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(37,99,235,0.45);">${index}</div>`,
		iconSize: [28, 28],
		iconAnchor: [14, 14],
		popupAnchor: [0, -14],
	});

const HCMC_CENTER = [10.7769, 106.7009];
const HCMC_BOUNDS = [
	[10.3731, 106.3533],
	[11.1603, 107.0305],
];

function MapCamera({ focusedLocation, linePositions, recenterKey }) {
	const map = useMap();
	const prevRecenterKey = useRef(recenterKey);

	useEffect(() => {
		if (recenterKey !== prevRecenterKey.current) {
			prevRecenterKey.current = recenterKey;
			if (recenterKey > 0 && linePositions.length >= 2) {
				const latlngs = linePositions.map((p) => L.latLng(p[0], p[1]));
				map.fitBounds(L.latLngBounds(latlngs), {
					padding: [52, 52],
					maxZoom: 16,
					animate: true,
				});
			}
		}
	}, [recenterKey, linePositions, map]);

	useEffect(() => {
		const hasLine = linePositions.length >= 2;
		if (focusedLocation) {
			map.flyTo([focusedLocation.lat, focusedLocation.lng], 17, {
				animate: true,
				duration: 0.85,
			});
			return;
		}
		if (hasLine) {
			const latlngs = linePositions.map((p) => L.latLng(p[0], p[1]));
			map.fitBounds(L.latLngBounds(latlngs), {
				padding: [52, 52],
				maxZoom: 16,
				animate: true,
			});
		}
	}, [focusedLocation, linePositions, map]);

	return null;
}

export default function MapView({
	focusedLocation,
	route,
	shortestPath,
	onShortestPathChange,
	onFocusLocation,
	recenterKey = 0,
}) {
	const [routePanelOpen, setRoutePanelOpen] = useState(true);

	const ordered = useMemo(() => {
		const waypoints = route?.waypoints ?? [];
		if (!waypoints.length) return [];
		return shortestPath
			? orderWaypointsShortest(waypoints)
			: [...waypoints];
	}, [route, shortestPath]);

	const linePositions = useMemo(
		() => ordered.map((w) => [w.lat, w.lng]),
		[ordered],
	);

	const lineForCamera = route ? linePositions : [];

	return (
		<div className="w-full h-full z-0 relative">
			<MapContainer
				center={HCMC_CENTER}
				zoom={14}
				minZoom={10}
				maxBounds={HCMC_BOUNDS}
				maxBoundsViscosity={1.0}
				zoomControl={false}
				className="w-full h-full bg-slate-50"
			>
				<ZoomControl position="bottomright" />

				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>

				<MapCamera
					focusedLocation={focusedLocation}
					linePositions={lineForCamera}
					recenterKey={recenterKey}
				/>

				{linePositions.length >= 2 && (
					<Polyline
						positions={linePositions}
						pathOptions={{
							color: "#2563eb",
							weight: 5,
							opacity: 0.85,
						}}
					/>
				)}

				{ordered.map((w, i) => (
					<Marker
						key={`${w.id ?? w.name}-${i}`}
						position={[w.lat, w.lng]}
						icon={createNumberedMarkerIcon(i + 1)}
					>
						<Popup autoPan={false}>
							<div className="text-sm font-medium">
								{i + 1}. {w.name}
							</div>
						</Popup>
					</Marker>
				))}

				{!route && focusedLocation && (
					<Marker
						position={[focusedLocation.lat, focusedLocation.lng]}
					>
						<Popup autoPan={false}>{focusedLocation.name}</Popup>
					</Marker>
				)}

				{!route && !focusedLocation && (
					<Marker position={HCMC_CENTER}>
						<Popup>Trung tâm TP.HCM</Popup>
					</Marker>
				)}
			</MapContainer>

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

						<label className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 cursor-pointer select-none hover:bg-slate-800/40">
							<input
								type="checkbox"
								className="rounded border-slate-600"
								checked={shortestPath}
								onChange={(e) =>
									onShortestPathChange?.(e.target.checked)
								}
							/>
							<span className="text-sm text-slate-300">
								Đường đi ngắn nhất (sắp xếp lại điểm — giả lập)
							</span>
						</label>

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
