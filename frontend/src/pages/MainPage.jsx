import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MapView from "@/components/Map/MapView";

export default function MainPage() {
	const [focusedLocation, setFocusedLocation] = useState(null);
	const [detailLocation, setDetailLocation] = useState(null);
	const [stops, setStops] = useState([]);
	const [routeSuggestions, setRouteSuggestions] = useState([]);
	const [selectedRoute, setSelectedRoute] = useState(null);
	const [shortestPath, setShortestPath] = useState(false);
	const [mapRecenterKey, setMapRecenterKey] = useState(0);

	const handleReviewSelectedRoute = () => {
		setFocusedLocation(null);
		setMapRecenterKey((k) => k + 1);
	};

	return (
		<div className="relative h-screen w-full overflow-hidden bg-slate-100">
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
					onShortestPathChange={setShortestPath}
					onFocusLocation={setFocusedLocation}
					recenterKey={mapRecenterKey}
				/>
			</main>
		</div>
	);
}
