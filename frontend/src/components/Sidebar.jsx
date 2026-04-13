import { useState, useEffect, useRef } from "react";
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
	Loader2,
	Sparkles,
	BrainCircuit,
	MapPinned,
} from "lucide-react";
import { buildMockItinerarySuggestions } from "@/lib/mockItineraries";

const resolveImageUrl = (path) => {
	if (!path) return "https://images.unsplash.com/photo-1549416801-92732958742d?q=80&w=1470&auto=format&fit=crop";
	if (path.startsWith("http")) return path;
	
	// Tránh double slash khi nối localhost:8000 với path
	const baseUrl = "http://localhost:8000";
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${cleanPath}`;
};

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
	const [heroImageOverride, setHeroImageOverride] = useState(null);
	const [activeTab, setActiveTab] = useState("plan");

	const [searchTerm, setSearchTerm] = useState("");
	const [suggestions, setSuggestions] = useState([]);
	const [selectedLocation, setSelectedLocation] = useState(null);

	const [goalText, setGoalText] = useState("");

	const [expandedRouteId, setExpandedRouteId] = useState(null);
	const [selectedSuggestionId, setSelectedSuggestionId] = useState(null);
	const [draggingIndex, setDraggingIndex] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [duplicateId, setDuplicateId] = useState(null);
	const [previewImage, setPreviewImage] = useState(null);
	const isSelectingRef = useRef(false);

	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchTerm(val);
		if (val.length === 0) {
			setSuggestions([]);
			setSelectedLocation(null);
		}
	};

	// Kỹ thuật debounce search (300ms sau khi người dùng ngừng gõ thì mới gọi API)
	useEffect(() => {
		if (searchTerm.trim().length === 0) {
			setSuggestions([]);
			return;
		}

		if (isSelectingRef.current) {
			isSelectingRef.current = false;
			return;
		}

		const delayDebounceFn = setTimeout(async () => {
			try {
				const response = await fetch(
					`http://localhost:8000/api/search-locations/?name=${encodeURIComponent(searchTerm)}`,
				);
				if (response.ok) {
					const data = await response.json();
					setSuggestions(data);
				} else {
					console.error("Lỗi khi tìm kiếm địa điểm");
				}
			} catch (error) {
				console.error("Network error:", error);
			}
		}, 300);

		return () => clearTimeout(delayDebounceFn);
	}, [searchTerm]);

	const handleSelectLocation = (loc) => {
		isSelectingRef.current = true;
		setSelectedLocation(loc);
		setSearchTerm(loc.name);
		setSuggestions([]);
	};

	const handleAddStop = () => {
		if (selectedLocation) {
			// Luôn thay thế địa điểm hiện tại bằng địa điểm mới chọn
			onStopsChange([selectedLocation]);
			onFocusLocation?.(selectedLocation);
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
		setHeroImageOverride(null);
		onDetailLocationChange(loc);
		onFocusLocation(loc);
		setActiveTab("detail");
	};

	const runSmartItinerary = async () => {
		if (stops.length < 1) return;
		setIsGenerating(true);

		const payload = {
			stops: stops.slice(0, 1).map((s) => ({
				id: s.id || s.poi_id,
				name: s.name,
				latitude: s.latitude,
				longitude: s.longitude,
			})),
			prompt_text: goalText.trim(),
		};

		console.log("[FE] Gửi lên /api/smart-itinerary/:", payload);

		try {
			const response = await fetch(
				"http://localhost:8000/api/smart-itinerary/",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const result = await response.json();
			console.log("[FE] Kết quả Smart Itinerary:", result);

			// Chuyển đổi format routes từ backend sang format frontend
			const suggestionsList = (result.routes || []).map((r) => ({
				id: r.id,
				label: r.label,
				theme: r.theme,
				description: r.description,
				ai_reason: r.ai_reason,
				duration_text: r.duration_text,
				total_stops: r.total_stops,
				waypoints: r.waypoints || [],
				// Polyline thực tế từ OSRM để vẽ lên bản đồ
				polyline: r.polyline || null,
			}));

			onResetShortestPath?.();
			onRouteSuggestionsChange(suggestionsList);
			setSelectedSuggestionId(null);
			onSelectedRouteChange(null);
			onDetailLocationChange(null);
			onFocusLocation(null);
			setExpandedRouteId(null);
			setActiveTab("results");
		} catch (err) {
			console.error("[FE] Lỗi khi gọi Smart Itinerary API:", err);
			// Fallback về mock nếu API lỗi (giữ trải nghiệm người dùng)
			const suggestionsList = buildMockItinerarySuggestions(
				stops,
				goalText,
			);
			onRouteSuggestionsChange(suggestionsList);
			setSelectedSuggestionId(null);
			onSelectedRouteChange(null);
			onDetailLocationChange(null);
			onFocusLocation(null);
			setExpandedRouteId(null);
			setActiveTab("results");
		} finally {
			setIsGenerating(false);
		}
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
										Vị trí bắt đầu
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
										<div className="absolute top-[4.25rem] left-0 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
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
												Chọn
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

								{stops.map((s, i) => {
									const isLast = i === stops.length - 1;
									const isDuplicate =
										duplicateId === (s.id || s.poi_id);

									return (
										<div
											key={`${s.id}-${i}`}
											className={`flex items-center justify-between text-sm text-slate-300 bg-slate-800/50 p-2 rounded transition-all group border border-transparent ${
												isDuplicate
													? "animate-shake ring-2 ring-yellow-500/50 bg-yellow-500/10"
													: draggingIndex === i
														? "ring-1 ring-blue-500/70 bg-slate-800"
														: "hover:bg-slate-800/80 hover:border-slate-700/50 shadow-sm"
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
											<div className="flex items-center gap-3 min-w-0 flex-1">
												<button
													type="button"
													draggable
													title={
														isLast
															? "Điểm đến cuối cùng"
															: "Kéo thả để đổi thứ tự"
													}
													onDragStart={(e) => {
														e.dataTransfer.setData(
															"text/plain",
															String(i),
														);
														e.dataTransfer.effectAllowed =
															"move";
														setDraggingIndex(i);
													}}
													onDragEnd={() =>
														setDraggingIndex(null)
													}
													className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 shadow-inner ${
														isLast
															? "bg-blue-600 text-white ring-2 ring-blue-400/50 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
															: "bg-blue-600/20 text-blue-400 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white cursor-grab active:cursor-grabbing"
													}`}
												>
													<MapPin size={14} />
												</button>

												<GripVertical
													size={14}
													className="text-slate-600 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
												/>
												<span className="truncate font-medium text-slate-200">
													{s.name}
												</span>
											</div>

											<div className="flex items-center gap-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
												<button
													type="button"
													onClick={() =>
														onFocusLocation(s)
													}
													className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-400 transition-colors"
													title="Xem trên bản đồ"
												>
													<LocateFixed size={15} />
												</button>
												<button
													type="button"
													onClick={() =>
														openDetail(s)
													}
													className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-400 transition-colors"
													title="Xem chi tiết"
												>
													<Info size={15} />
												</button>
												<button
													type="button"
													onClick={() =>
														removeStop(i)
													}
													className="p-1.5 hover:bg-red-900/40 rounded-md text-slate-400 hover:text-red-400 transition-colors"
													title="Xóa điểm dừng"
												>
													<Trash2 size={15} />
												</button>
											</div>
										</div>
									);
								})}

								<div className="space-y-2">
									<Label
										htmlFor="goal-text"
										className="text-slate-400 text-xs uppercase tracking-wider"
									>
										Kế hoạch bạn muốn thực hiện
									</Label>

									<textarea
										id="goal-text"
										name="goalText"
										value={goalText ?? ""}
										rows={3}
										maxLength={300}
										onChange={(e) =>
											setGoalText(e.target.value)
										}
										placeholder="VD: Muốn lộ trình tham quan quận 1 trong 1 buổi chiều..."
										className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[84px]"
									/>
									<p className="text-[11px] text-slate-500 text-right">
										{(goalText ?? "").length}/300
									</p>
								</div>

								<div className="mt-auto pt-2 pb-1">
									<Button
										type="button"
										disabled={
											isGenerating || stops.length < 1
										}
										className={`w-full text-md py-6 transition-all duration-500 overflow-hidden relative group ${
											isGenerating
												? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
												: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
										}`}
										onClick={runSmartItinerary}
									>
										{isGenerating ? (
											<div className="flex items-center gap-1.5">
												<span className="dot-1 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
												<span className="dot-2 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
												<span className="dot-3 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
											</div>
										) : (
											<>
												<Navigation className="mr-2 group-hover:rotate-12 transition-transform" />
												Gợi ý lộ trình
											</>
										)}
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
										<div className="space-y-3">
											<div
												className="w-full h-48 bg-slate-800 rounded-2xl overflow-hidden relative shadow-2xl group border border-slate-700/50 cursor-zoom-in"
												onClick={() =>
													setPreviewImage(
														displayDetail.image,
													)
												}
											>
												<img
													src={resolveImageUrl(
														heroImageOverride ||
															displayDetail.image,
													)}
													alt={displayDetail.name}
													className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
												/>
												<div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent">
													<h3 className="font-bold text-xl text-white drop-shadow-md">
														{displayDetail.name}
													</h3>
												</div>
											</div>
										</div>
										<div className="space-y-1">
											<Label className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">
												Địa chỉ
											</Label>
											<p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
												{displayDetail.address || "???"}
											</p>
										</div>

										{/* Thông tin thêm: Sub Images */}
										{displayDetail.image_list &&
											displayDetail.image_list.length >
												1 && (
												<div className="space-y-2">
													<Label className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">
														Thông tin thêm
													</Label>
													<div className="grid grid-cols-4 gap-2">
														{displayDetail.image_list
															.slice(1)
															.map((img, idx) => (
																<div
																	key={idx}
																	className="aspect-square rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-blue-500 transition-all active:scale-95 shadow-lg group"
																	onClick={() =>
																		setHeroImageOverride(
																			img,
																		)
																	}
																>
																	<img
																		src={resolveImageUrl(
																			img,
																		)}
																		className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
																		alt="thumbnail"
																	/>
																</div>
															))}
													</div>
												</div>
											)}

										<div className="flex flex-wrap gap-2 pt-1">
											<span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[11px] font-medium rounded-full border border-amber-500/20">
												Đánh giá 4.8★
											</span>
											<span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[11px] font-medium rounded-full border border-green-500/20">
												Giờ mở cửa 8h–22h
											</span>
										</div>
										<div className="space-y-1">
											<Label className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">
												Mô tả
											</Label>
											<p className="text-sm text-slate-400 leading-relaxed bg-slate-800/20 p-3 rounded-lg border border-slate-800/50">
												{displayDetail.description ||
													"Địa điểm gợi ý trong đồ án — nội dung chi tiết có thể gắn API sau. Hiện dùng dữ liệu và hình ảnh minh họa."}
											</p>
										</div>
										<Button
											type="button"
											className="w-full mt-4 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 transition-colors"
											onClick={() => {
												if (!displayDetail) return;
												onStopsChange([
													displayDetail,
												]);
												onFocusLocation?.(
													displayDetail,
												); // Tu dong bay den
												setActiveTab("plan");
											}}
										>
											Chọn bắt đầu từ đây
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
														<div className="px-4 pb-4 pt-3 text-xs text-slate-400 space-y-3 border-t border-slate-800/80 bg-slate-900/30 rounded-b-xl">
															<div className="space-y-1.5">
																<div className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase text-[10px] tracking-wider">
																	<Sparkles
																		size={
																			12
																		}
																	/>
																	Góc nhìn AI
																</div>
																<p className="text-slate-300 leading-relaxed italic border-l-2 border-blue-500/30 pl-3">
																	&quot;
																	{
																		r.ai_reason
																	}
																	&quot;
																</p>
															</div>

															<div className="pt-2 border-t border-slate-800/50">
																<span className="text-slate-500 font-medium">
																	Lý do
																	chọn:{" "}
																</span>
																{r.description}
															</div>

															{r.duration_text && (
																<div className="text-[10px] text-slate-500">
																	Thời gian di
																	chuyển ước
																	tính:{" "}
																	<span className="text-blue-400">
																		{
																			r.duration_text
																		}
																	</span>
																</div>
															)}
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

			{isGenerating && (
				<div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/40 backdrop-blur-md transition-all duration-500 animate-in fade-in">
					<div className="relative flex flex-col items-center">
						{/* Glowing background circles */}
						<div className="absolute -inset-20 bg-blue-500/10 blur-[100px] rounded-full animate-pulse-glow"></div>
						<div
							className="absolute -inset-10 bg-indigo-500/5 blur-[60px] rounded-full animate-pulse-glow"
							style={{ animationDelay: "-1s" }}
						></div>

						<div className="relative">
							<div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
							<div className="relative bg-slate-900/80 border border-blue-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.2)] flex flex-col items-center gap-6 backdrop-blur-xl">
								<div className="relative w-20 h-20">
									<div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
									<div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
									<div className="absolute inset-2 border-2 border-blue-400/20 rounded-full animate-spin-slow"></div>
									<div className="absolute inset-0 flex items-center justify-center">
										<MapPinned
											className="text-blue-400 animate-pulse"
											size={36}
											strokeWidth={1.5}
										/>
									</div>
								</div>

								<div className="space-y-2 text-center">
									<h2 className="text-xl font-bold bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">
										Đang thiết kế lộ trình
									</h2>
									<p className="text-slate-400 text-sm animate-pulse tracking-wide">
										Sử dụng AI để tối ưu hóa quãng đường...
									</p>
								</div>

								<div className="flex gap-1">
									{[0, 1, 2, 3, 4].map((i) => (
										<div
											key={i}
											className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
											style={{
												animationDelay: `${i * 0.15}s`,
											}}
										></div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Fullscreen Image Preview */}
			{previewImage && (
				<div
					className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
					onClick={() => setPreviewImage(null)}
				>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full"
						onClick={() => setPreviewImage(null)}
					>
						<X size={28} />
					</Button>
					<img
						src={resolveImageUrl(previewImage)}
						className="max-w-full max-h-full object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
						alt="Preview"
					/>
				</div>
			)}
		</>
	);
}
