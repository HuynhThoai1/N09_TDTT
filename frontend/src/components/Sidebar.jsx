import { useState } from "react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
	Search,
	MapPin,
	Navigation,
	Info,
	Trash2,
	X,
	GripVertical,
	LocateFixed,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
} from "lucide-react";
import { LOCATIONS_DB } from "@/data/locations";
import { buildMockItinerarySuggestions } from "@/lib/mockItineraries";

export default function Sidebar({
	onFocusLocation,
	onStopsChange,
	stops = [],
	detailLocation,
	onDetailLocationChange,
	routeSuggestions,
	onRouteSuggestionsChange,
	selectedRoute,
	onSelectedRouteChange,
	onResetShortestPath,
	onReviewSelectedRoute,
}) {
	const [isOpen, setIsOpen] = useState(true);
	const [activeTab, setActiveTab] = useState("plan");

	const [searchTerm, setSearchTerm] = useState("");
	const [suggestions, setSuggestions] = useState([]);
	const [selectedLocation, setSelectedLocation] = useState(null);

	const [goalText, setGoalText] = useState("");

	const [expandedRouteId, setExpandedRouteId] = useState(null);
	const [selectedSuggestionId, setSelectedSuggestionId] = useState(null);
	const [draggingIndex, setDraggingIndex] = useState(null);

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchTerm(val);
		if (val.length > 0) {
			const filtered = LOCATIONS_DB.filter((loc) =>
				loc.name.toLowerCase().includes(val.toLowerCase()),
			);
			setSuggestions(filtered);
		} else {
			setSuggestions([]);
			setSelectedLocation(null);
		}
	};

	const handleSelectLocation = (loc) => {
		setSelectedLocation(loc);
		setSearchTerm(loc.name);
		setSuggestions([]);
	};

	const handleAddStop = () => {
		if (selectedLocation) {
			onStopsChange([...stops, selectedLocation]);
			setSearchTerm("");
			setSelectedLocation(null);
		}
	};

	const removeStop = (index) => {
		onStopsChange(stops.filter((_, idx) => idx !== index));
	};

	const moveStop = (fromIndex, toIndex) => {
		if (fromIndex === toIndex || fromIndex === null || toIndex === null)
			return;
		const nextStops = [...stops];
		const [moved] = nextStops.splice(fromIndex, 1);
		nextStops.splice(toIndex, 0, moved);
		onStopsChange(nextStops);
	};

	const openDetail = (loc) => {
		onDetailLocationChange(loc);
		onFocusLocation(loc);
		setActiveTab("detail");
	};

	const runMockComputation = () => {
		const payload = {
			stops: stops.map((s) => ({
				id: s.id,
				name: s.name,
				lat: s.lat,
				lng: s.lng,
			})),
			goalText: goalText.trim(),
		};
		console.log("[FE mock] payload gửi server:", payload);

		onResetShortestPath?.();
		const suggestionsList = buildMockItinerarySuggestions(stops, goalText);
		onRouteSuggestionsChange(suggestionsList);
		setSelectedSuggestionId(null);
		onSelectedRouteChange(null);
		onDetailLocationChange(null);
		onFocusLocation(null);
		setExpandedRouteId(null);
		setActiveTab("results");
	};

	const selectRouteSuggestion = (route) => {
		setSelectedSuggestionId(route.id);
		onSelectedRouteChange(route);
		onFocusLocation(null);
	};

	const handleReview = () => {
		const picked = routeSuggestions.find(
			(r) => r.id === selectedSuggestionId,
		);
		if (!picked) return;
		onSelectedRouteChange(picked);
		onReviewSelectedRoute?.();
	};

	const displayDetail = detailLocation ?? selectedLocation;

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`fixed top-1/2 -translate-y-1/2 z-[1002] w-6 h-14 bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center rounded-r-xl transition-all duration-300 hover:bg-slate-800 text-slate-300
                ${isOpen ? "left-[28rem]" : "left-0"}`}
			>
				{isOpen ? (
					<ChevronLeft size={20} />
				) : (
					<ChevronRight size={20} />
				)}
			</button>

			<aside
				className={`fixed top-0 left-0 h-full bg-slate-950/80 backdrop-blur-xl shadow-[5px_0_20px_rgba(0,0,0,0.5)] z-[1001] transition-all duration-300 ease-in-out border-r border-slate-800 overflow-hidden
                ${isOpen ? "w-[28rem] translate-x-0" : "w-0 -translate-x-full"}`}
			>
				<div className="w-[28rem] h-full flex flex-col text-slate-100 overflow-y-auto">
					<div className="flex px-4 pt-6 pb-2 border-b border-slate-800 shrink-0">
						<button
							type="button"
							className={`flex-1 pb-2 text-sm font-semibold transition-all ${activeTab === "plan" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500 hover:text-slate-300"}`}
							onClick={() => setActiveTab("plan")}
						>
							Lên kế hoạch
						</button>
						<button
							type="button"
							className={`flex-1 pb-2 text-sm font-semibold transition-all ${activeTab === "detail" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500 hover:text-slate-300"}`}
							onClick={() => setActiveTab("detail")}
						>
							Chi tiết
						</button>
						<button
							type="button"
							className={`flex-1 pb-2 text-sm font-semibold transition-all ${activeTab === "results" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500 hover:text-slate-300"}`}
							onClick={() => setActiveTab("results")}
						>
							Kết quả
						</button>
					</div>

					<div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
						<div
							className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === "plan" ? "" : "hidden"}`}
						>
							<div className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col no-scrollbar">
								<div className="space-y-3 relative">
									<Label className="text-slate-400 text-xs uppercase tracking-wider">
										Thêm điểm dừng
									</Label>
									<div className="relative">
										<Search
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
											size={16}
										/>
										<Input
											placeholder="VD: Nhà thờ Đức Bà..."
											value={searchTerm}
											onChange={handleSearchChange}
											className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
										/>
										{searchTerm && (
											<button
												type="button"
												onClick={() => {
													setSearchTerm("");
													setSelectedLocation(null);
												}}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
											>
												<X size={16} />
											</button>
										)}
									</div>

									{suggestions.length > 0 && (
										<div className="absolute top-[4.25rem] left-0 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
											{suggestions.map((loc) => (
												<button
													type="button"
													key={loc.id}
													className="p-3 hover:bg-slate-800 cursor-pointer flex flex-col border-b border-slate-800 last:border-0 w-full text-left"
													onClick={() =>
														handleSelectLocation(
															loc,
														)
													}
												>
													<span className="font-medium text-blue-100">
														{loc.name}
													</span>
													<span className="text-xs text-slate-500 truncate">
														{loc.address}
													</span>
												</button>
											))}
										</div>
									)}

									{selectedLocation && (
										<div className="flex gap-2 pt-2">
											<Button
												type="button"
												onClick={handleAddStop}
												className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]"
											>
												<MapPin
													size={16}
													className="mr-2"
												/>
												Thêm điểm dừng
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													openDetail(selectedLocation)
												}
												className="flex-1 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
											>
												<Info
													size={16}
													className="mr-2"
												/>
												Chi tiết
											</Button>
										</div>
									)}
								</div>

								{stops.length > 0 && (
									<div className="space-y-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
										<Label className="text-slate-400 text-xs uppercase tracking-wider">
											Danh sách điểm dừng
										</Label>
										<div className="space-y-2">
											{stops.map((s, i) => (
												<div
													key={`${s.id}-${i}`}
													className={`flex items-center justify-between text-sm text-slate-300 bg-slate-800/50 p-2 rounded transition-colors group ${
														draggingIndex === i
															? "ring-1 ring-blue-500/70 bg-slate-800"
															: "hover:bg-slate-800"
													}`}
													onDragOver={(e) => {
														e.preventDefault();
													}}
													onDrop={(e) => {
														e.preventDefault();
														const from = Number(
															e.dataTransfer.getData(
																"text/plain",
															),
														);
														moveStop(from, i);
														setDraggingIndex(null);
													}}
												>
													<div className="flex items-center gap-2 min-w-0">
														<button
															type="button"
															draggable
															title="Kéo thả để đổi thứ tự"
															aria-label={`Kéo thả để đổi thứ tự điểm dừng ${i + 1}`}
															onDragStart={(
																e,
															) => {
																e.dataTransfer.setData(
																	"text/plain",
																	String(i),
																);
																e.dataTransfer.effectAllowed =
																	"move";
																setDraggingIndex(
																	i,
																);
															}}
															onDragEnd={() =>
																setDraggingIndex(
																	null,
																)
															}
															className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0 cursor-grab active:cursor-grabbing"
														>
															{i + 1}
														</button>
														<GripVertical
															size={14}
															className="text-slate-500 shrink-0"
														/>
														<span className="truncate">
															{s.name}
														</span>
													</div>
													<div className="flex items-center gap-1 shrink-0">
														<button
															type="button"
															title="Vị trí"
															aria-label={`Tập trung ${s.name} trên bản đồ`}
															className="p-1 text-slate-500 hover:text-blue-300"
															onClick={() =>
																onFocusLocation(
																	s,
																)
															}
														>
															<LocateFixed
																size={14}
															/>
														</button>
														<button
															type="button"
															title="Xem chi tiết"
															aria-label={`Xem chi tiết ${s.name}`}
															className="p-1 text-slate-500 hover:text-amber-300"
															onClick={() =>
																openDetail(s)
															}
														>
															<Info size={14} />
														</button>
														<button
															type="button"
															title="Xóa"
															aria-label={`Xóa ${s.name}`}
															className="p-1 text-slate-500 hover:text-red-400"
															onClick={() =>
																removeStop(i)
															}
														>
															<Trash2 size={14} />
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								<div className="space-y-2">
									<Label
										htmlFor="goal-text"
										className="text-slate-400 text-xs uppercase tracking-wider"
									>
										Kế hoạch bạn muồn thực hiện
									</Label>
									<textarea
										id="goal-text"
										value={goalText}
										rows={2}
										onChange={(e) =>
											setGoalText(e.target.value)
										}
										placeholder="VD: Muốn lộ trình..."
										className="w-full max-h-[3.5rem] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-5 text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none overflow-y-auto"
									/>
								</div>

								<div className="mt-auto pt-2 pb-1">
									<Button
										type="button"
										className="w-full bg-blue-600 hover:bg-blue-500 text-md py-6 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
										onClick={runMockComputation}
									>
										<Navigation className="mr-2" />
										Gợi ý lộ trình
									</Button>
								</div>
							</div>
						</div>

						<div
							className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === "detail" ? "" : "hidden"}`}
						>
							<div className="p-6 flex-1 overflow-y-auto no-scrollbar bg-slate-900/10 space-y-4">
								{displayDetail ? (
									<div className="space-y-4">
										<div className="w-full h-40 bg-slate-800 rounded-lg overflow-hidden relative">
											<img
												src={displayDetail.image}
												alt={displayDetail.name}
												className="object-cover w-full h-full opacity-60 mix-blend-overlay"
											/>
											<div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 to-transparent">
												<h3 className="font-bold text-xl text-white">
													{displayDetail.name}
												</h3>
											</div>
										</div>
										<p className="text-sm text-slate-400">
											{displayDetail.address}
										</p>
										<div className="flex flex-wrap gap-2 pt-2">
											<span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded border border-amber-500/20">
												Đánh giá 4.8★ (mock)
											</span>
											<span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
												Giờ mở cửa 8h–22h (mock)
											</span>
										</div>
										<p className="text-sm text-slate-300 leading-relaxed mt-4">
											Địa điểm gợi ý trong đồ án — nội
											dung chi tiết có thể gắn API sau.
											Hiện dùng dữ liệu và hình ảnh minh
											họa.
										</p>
										<Button
											type="button"
											className="w-full mt-4 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 transition-colors"
											onClick={() => {
												if (!displayDetail) return;
												if (
													!stops.some(
														(s) =>
															s.id ===
															displayDetail.id,
													)
												) {
													onStopsChange([
														...stops,
														displayDetail,
													]);
												}
												setActiveTab("plan");
											}}
										>
											+ Thêm vào danh sách điểm dừng
										</Button>
									</div>
								) : (
									<div className="flex flex-col items-center justify-center min-h-[280px] text-slate-500 space-y-4 opacity-50 px-10">
										<Info
											size={48}
											className="opacity-20"
										/>
										<p className="text-center text-sm">
											Chưa chọn địa điểm.
											<br />
											Tìm ở tab Lên kế hoạch hoặc bấm tên
											địa danh trong Kết quả.
										</p>
									</div>
								)}
							</div>
						</div>

						<div
							className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === "results" ? "" : "hidden"}`}
						>
							<div className="flex-1 overflow-y-auto p-6 no-scrollbar bg-slate-900/10 space-y-4 min-h-0">
								<p className="text-xs text-slate-500">
									Dữ liệu minh họa. Payload thực tế khi có
									API: danh sách điểm dừng + mục tiêu + ngữ
									cảnh (xem console khi bấm gợi ý).
								</p>

								{routeSuggestions.length === 0 ? (
									<div className="py-16 text-center text-slate-500 text-sm">
										Chưa có gợi ý. Hãy bấm &quot;Gợi ý lộ
										trình&quot; ở tab Lên kế hoạch.
									</div>
								) : (
									<ul className="space-y-3">
										{routeSuggestions.map((r) => {
											const isOn =
												selectedSuggestionId === r.id;
											const isExpanded =
												expandedRouteId === r.id;
											return (
												<li
													key={r.id}
													className={`rounded-xl border transition-colors ${isOn ? "border-blue-500/50 bg-slate-800/40" : "border-slate-800 bg-slate-900/30"}`}
												>
													<div className="flex gap-3 p-3 items-start">
														<button
															type="button"
															onClick={() =>
																selectRouteSuggestion(
																	r,
																)
															}
															className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-colors ${isOn ? "border-blue-400 bg-blue-500" : "border-slate-500 bg-transparent hover:border-slate-300"}`}
															aria-pressed={isOn}
															aria-label={`Chọn lộ trình ${r.label}`}
														/>

														<div className="flex-1 min-w-0 space-y-2">
															<div className="flex items-center justify-between gap-2">
																<h3 className="text-sm font-semibold text-slate-100">
																	{r.label}
																</h3>
																<span className="text-[10px] uppercase text-slate-500 shrink-0">
																	{
																		r.totalDuration
																	}{" "}
																	·{" "}
																	{
																		r.totalDistance
																	}
																</span>
															</div>

															<p className="text-xs text-slate-400 leading-relaxed">
																{r.waypoints.map(
																	(
																		w,
																		idx,
																	) => (
																		<span
																			key={`${r.id}-${w.id}-${idx}`}
																		>
																			{idx >
																				0 && (
																				<span className="text-slate-600">
																					{" "}
																					→{" "}
																				</span>
																			)}
																			<button
																				type="button"
																				className="text-blue-300 hover:text-blue-200 hover:underline font-medium"
																				onClick={() =>
																					openDetail(
																						w,
																					)
																				}
																			>
																				{
																					w.name
																				}
																			</button>
																		</span>
																	),
																)}
															</p>

															<button
																type="button"
																className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
																onClick={() =>
																	setExpandedRouteId(
																		isExpanded
																			? null
																			: r.id,
																	)
																}
															>
																<ChevronDown
																	className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
																	size={14}
																/>
																{isExpanded
																	? "Thu gọn chi tiết"
																	: "Chi tiết lộ trình"}
															</button>
														</div>
													</div>

													{isExpanded && (
														<div className="px-3 pb-3 pt-0 text-xs text-slate-400 space-y-2 border-t border-slate-800/80 mx-3 mb-3">
															<p>
																<span className="text-slate-500 font-medium">
																	Vì sao hợp
																	lý:{" "}
																</span>
																{
																	r.whyInteresting
																}
															</p>
															<p>
																<span className="text-slate-500 font-medium">
																	Thời gian &
																	gợi ý:{" "}
																</span>
																{r.timeAndTips}
															</p>
															<p className="text-[10px] text-slate-600 italic">
																Gợi ý dựa trên:
																&quot;
																{
																	r.mockMeta
																		.goalHint
																}
																&quot; — ngữ
																cảnh:{" "}
																{
																	r.mockMeta
																		.contextSnippet
																}
															</p>
														</div>
													)}
												</li>
											);
										})}
									</ul>
								)}

								<div className="pt-2 pb-6 space-y-2 border-t border-slate-800/80">
									{/* <Button
										type="button"
										className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
										disabled={!selectedSuggestionId}
										onClick={handleReview}
									>
										Review lộ trình đã chọn
									</Button> */}
									{selectedRoute && selectedSuggestionId && (
										<p className="text-[11px] text-slate-500 text-center">
											Đang xem:{" "}
											<span className="text-slate-300">
												{selectedRoute.label}
											</span>{" "}
											— xem polyline trên bản đồ và panel
											mũi tên bên phải.
										</p>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</aside>
		</>
	);
}
