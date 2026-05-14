import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MapView from "@/components/Map/MapView";
import UserAuthMenu from "@/components/UserAuthMenu";

const getApiBase = () => {
    return "http://192.168.46.87:8000"; 
};

export default function MainPage() {
	const [focusedLocation, setFocusedLocation] = useState(null);
	const [detailLocation, setDetailLocation] = useState(null);
	const [stops, setStops] = useState([]);
	const [routeSuggestions, setRouteSuggestions] = useState([]);
	const [selectedRoute, setSelectedRoute] = useState(null);
	const [shortestPath, setShortestPath] = useState(false);
	const [mapRecenterKey, setMapRecenterKey] = useState(0);
	const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);

	const handleReviewSelectedRoute = () => {
		setFocusedLocation(null);
		setMapRecenterKey((k) => k + 1);
	};

	// Recalculate route when waypoints are reordered or added/removed
	const handleReorderWaypoints = async (newWaypoints) => {
		// newWaypoints is an array of waypoint objects in the new order
		if (!selectedRoute) return false;
		setIsRecalculatingRoute(true);

		try {
			// Prepare waypoints for API call
			const waypointsForApi = newWaypoints.map((w) => ({
				id: w.id || w.poi_id,
				name: w.name,
				latitude: w.latitude,
				longitude: w.longitude,
			}));

			// Call backend to recalculate route with new waypoint order
			const response = await fetch(
				`${getApiBase()}/api/smart-itinerary/`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						stops: waypointsForApi,
						prompt_text: "", // No additional prompt, just recalculate
					}),
				}
			);

			if (response.ok) {
				const result = await response.json();
				// Take the first route returned and extract the polyline
				const firstRoute = result.routes?.[0];
				if (firstRoute) {
					setSelectedRoute((prev) => ({
						...prev,
						waypoints: newWaypoints,
						polyline: firstRoute.polyline || null,
						// Update duration and distance if available
						totalDuration: firstRoute.duration_text || prev.totalDuration,
						totalDistance: firstRoute.distance_text || prev.totalDistance,
					}));
					return true;
				} else {
					// Fallback: just update waypoints if no polyline returned
					setSelectedRoute((prev) => ({
						...prev,
						waypoints: newWaypoints,
					}));
					return false;
				}
			} else {
				// If API fails, just update waypoints
				setSelectedRoute((prev) => ({
					...prev,
					waypoints: newWaypoints,
				}));
				return false;
			}
		} catch (error) {
			console.error("Error recalculating route:", error);
			// Fallback: update waypoints even if API fails
			setSelectedRoute((prev) => ({
				...prev,
				waypoints: newWaypoints,
			}));
			return false;
		} finally {
			setIsRecalculatingRoute(false);
		}
	};

	// Optimize entire route (re-order & recalculate using backend optimizer)
	const handleOptimizeRoute = async () => {
		if (!selectedRoute || !selectedRoute.waypoints) return false;
		setIsRecalculatingRoute(true);
		try {
			const waypointsForApi = selectedRoute.waypoints.map((w) => ({
				id: w.id || w.poi_id,
				name: w.name,
				latitude: w.latitude,
				longitude: w.longitude,
			}));
			// Ask backend to optimize route; indicate endpoints should be fixed if backend supports it
			const response = await fetch(`${getApiBase()}/api/smart-itinerary/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ stops: waypointsForApi, prompt_text: "Optimize route", fix_endpoints: true }),
			});
			if (response.ok) {
				const result = await response.json();
				const firstRoute = result.routes?.[0];
				if (firstRoute) {
					// Ensure first and last waypoint remain fixed. Use API's ordering for middle points only.
					const original = selectedRoute.waypoints || [];
					const first = original[0];
					const last = original[original.length - 1];
					const apiWaypoints = firstRoute.waypoints || [];
					// Build a map from identifying key -> original waypoint to preserve metadata
					const keyOf = (w) => (w.id || w.poi_id) || `${w.latitude},${w.longitude}`;
					const origMap = new Map();
					original.forEach((w) => origMap.set(keyOf(w), w));

					// Filter apiWaypoints to middle ones (exclude endpoints by matching coords/ids)
					const middle = apiWaypoints
						.filter((w) => {
							const k = keyOf(w);
							if (!k) return true;
							// consider equal to first/last if keys match or coordinates match closely
							const isFirst = (first && (k === keyOf(first)) || (first && Math.abs((w.latitude || w.lat) - (first.latitude || first.lat)) < 1e-6 && Math.abs((w.longitude || w.lng || w.longitude) - (first.longitude || first.lng || first.longitude)) < 1e-6));
							const isLast = (last && (k === keyOf(last)) || (last && Math.abs((w.latitude || w.lat) - (last.latitude || last.lat)) < 1e-6 && Math.abs((w.longitude || w.lng || w.longitude) - (last.longitude || last.lng || last.longitude)) < 1e-6));
							return !isFirst && !isLast;
						})
						.map((w) => origMap.get(keyOf(w)) || w);

					const newWaypoints = [first, ...middle, last].filter(Boolean);
					setSelectedRoute((prev) => ({
						...prev,
						waypoints: newWaypoints,
						polyline: firstRoute.polyline || prev.polyline,
						totalDuration: firstRoute.duration_text || prev.totalDuration,
						totalDistance: firstRoute.distance_text || prev.totalDistance,
					}));
					return true;
				}
			}
			// fallback
			return false;
		} catch (err) {
			console.error("Optimize route error:", err);
			return false;
		} finally {
			setIsRecalculatingRoute(false);
		}
	};

	return (
		<div className="relative h-screen w-full overflow-hidden bg-slate-100">
            <UserAuthMenu />
			<Sidebar
				onFocusLocation={setFocusedLocation}
				onStopsChange={setStops}
				stops={stops}
				detailLocation={detailLocation}
				onDetailLocationChange={setDetailLocation}
				routeSuggestions={routeSuggestions}
				onRouteSuggestionsChange={setRouteSuggestions}
				selectedRoute={selectedRoute}
				onSelectedRouteChange={setSelectedRoute}
				onResetShortestPath={() => setShortestPath(false)}
				onReviewSelectedRoute={handleReviewSelectedRoute}
			/>

			<main className="h-full w-full relative z-0">
				<MapView
					focusedLocation={focusedLocation}
					route={selectedRoute}
					shortestPath={shortestPath}
					onShortestPathChange={handleReorderWaypoints}
					onFocusLocation={setFocusedLocation}
					onDetailLocationChange={setDetailLocation}
					isRecalculatingRoute={isRecalculatingRoute}
					onOptimizeRoute={handleOptimizeRoute}
					recenterKey={mapRecenterKey}
				/>
			</main>
		</div>
	);
}
