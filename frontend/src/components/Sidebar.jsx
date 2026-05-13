import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import ProfileModal from "./ProfileModal";
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
	LocateFixed,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Sparkles,
	MapPinned,
	Share2,
	Check,
} from "lucide-react";

// import AIClarification from "./AIClarification.jsx";


const getApiBase = () => {
	return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
};

const resolveImageUrl = (path) => {
	if (!path)
		return "https://images.unsplash.com/photo-1549416801-92732958742d?q=80&w=1470&auto=format&fit=crop";
	if (path.startsWith("http")) return path;
	const baseUrl = getApiBase();
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
	// STATE ĐĂNG NHẬP 
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [user, setUser] = useState(null);
	const [userVibes, setUserVibes] = useState([]);


	// 2. STATE GIAO DIỆN
	const [isOpen, setIsOpen] = useState(true);
	const [heroImageOverride, setHeroImageOverride] = useState(null);
	const [activeTab, setActiveTab] = useState("plan");
	const navigate = useNavigate();

	const [searchTerm, setSearchTerm] = useState("");
	const [suggestions, setSuggestions] = useState([]);
	const [selectedLocation, setSelectedLocation] = useState(null);
	const [goalText, setGoalText] = useState("");

	const [expandedRouteId, setExpandedRouteId] = useState(null);
	const [selectedSuggestionId, setSelectedSuggestionId] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [duplicateId, setDuplicateId] = useState(null);
	const [previewImage, setPreviewImage] = useState(null);
	const [shareState, setShareState] = useState({
		routeId: null,
		status: "idle",
		message: "",
	});
	const isSelectingRef = useRef(false);

	const [showAIQuestions, setShowAIQuestions] = useState(true);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [aiAnswers, setAIAnswers] = useState({});
	const [otherAnswer, setOtherAnswer] = useState("");

	const aiQuestions = [
		{
			id: 1,
			question: "Chuyến đi này bạn dự định đi cùng ai?",
			options: [
				{ id: "A", text: "Đi một mình" },
				{ id: "B", text: "Cùng người yêu/bạn đời" },
				{ id: "C", text: "Cùng gia đình (trẻ nhỏ/người già)" },
				{ id: "D", text: "Nhóm bạn thân" },
			],
		},
		{
			id: 2,
			question: "Mức độ vận động mong muốn của bạn?",
			options: [
				{ id: "A", text: "Nhẹ nhàng (Thư giãn, cafe)" },
				{ id: "B", text: "Vừa phải (Đi bộ, tham quan)" },
				{ id: "C", text: "Năng động (Hoạt động ngoài trời)" },
				{ id: "D", text: "Thử thách (Leo trèo, khám phá)" },
			],
		},
		{
			id: 3,
			question: "Ngân sách dự kiến cho các hoạt động?",
			options: [
				{ id: "A", text: "Tiết kiệm nhất có thể" },
				{ id: "B", text: "Phổ thông (Cân đối)" },
				{ id: "C", text: "Thoải mái (Sang chảnh)" },
				{ id: "D", text: "Không giới hạn" },
			],
		},
	];

	// LOGIC ĐĂNG NHẬP VÀ VIBES 
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			setUser(currentUser);
			if (currentUser) {
				try {
					const token = await currentUser.getIdToken();
					const response = await fetch(`${getApiBase()}/api/profile/vibes/`, {
						headers: { 'Authorization': `Bearer ${token}` }
					});
					if (response.ok) {
						const data = await response.json();
						setUserVibes(data.vibes || []);
					}
				} catch (err) {
					console.error("Lỗi fetch vibes:", err);
				}
			} else {
				setUserVibes([]);
			}
		});
		return () => unsubscribe();
	}, []);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigate('/login');
		} catch (error) {
			console.error("Lỗi đăng xuất:", error);
		}
	};

	// CÁC HÀM XỬ LÝ MAP 
	const handleSearchChange = (e) => {
		const val = e.target.value;
		setSearchTerm(val);
		if (val.length === 0) {
			setSuggestions([]);
			setSelectedLocation(null);
		}
	};

	useEffect(() => {
		if (!detailLocation) return;
		setIsOpen(true);
		setActiveTab("detail");
	}, [detailLocation]);

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
					`${getApiBase()}/api/goong/autocomplete/?input=${encodeURIComponent(searchTerm)}`,
				);
				if (response.ok) {
					const data = await response.json();
					const mapped = (data.predictions || []).map((p) => ({
						id: p.place_id,
						poi_id: p.place_id,
						name: p.description,
						address: p.compound?.address || p.description,
						latitude: null,
						longitude: null,
						is_goong_place: true,
					}));
					setSuggestions(mapped);
				}
			} catch (error) {
				console.error("Network error:", error);
			}
		}, 300);
		return () => clearTimeout(delayDebounceFn);
	}, [searchTerm]);

	const handleSelectLocation = async (loc) => {
		isSelectingRef.current = true;
		if (loc.is_goong_place) {
			try {
				const response = await fetch(
					`${getApiBase()}/api/goong/place-detail/?place_id=${encodeURIComponent(loc.poi_id)}`,
				);
				if (response.ok) {
					const detail = await response.json();
					if (detail && detail.result) {
						const result = detail.result;
						const updatedLoc = {
							...loc,
							latitude: result.geometry.location.lat,
							longitude: result.geometry.location.lng,
							name: result.name,
							address: result.formatted_address,
						};
						setSelectedLocation(updatedLoc);
						setSearchTerm(loc.name || result.formatted_address);
						onFocusLocation?.({ ...updatedLoc, isSearching: true });
					}
				}
			} catch (error) {
				console.error("Lỗi khi lấy chi tiết địa điểm Goong:", error);
			}
		} else {
			setSelectedLocation(loc);
			setSearchTerm(loc.name);
			onFocusLocation?.({ ...loc, isSearching: true });
		}
		setSuggestions([]);
	};

	const handleAddStop = () => {
		if (selectedLocation) {
			onStopsChange([selectedLocation]);
			onFocusLocation?.(selectedLocation);
			setSearchTerm("");
			setSelectedLocation(null);
		}
	};

	const removeStop = (index) => {
		onStopsChange(stops.filter((_, idx) => idx !== index));
	};

	const openDetail = (loc) => {
		setHeroImageOverride(null);
		onDetailLocationChange(loc);
		onFocusLocation(loc);
		setActiveTab("detail");
	};

	// HÀM AI GỢI Ý
	const runSmartItinerary = async () => {
		if (stops.length < 1) return;
		setShowAIQuestions(true);
		setCurrentQuestionIndex(0);
	};

	const handleFinishAIQuestions = async () => {
		setIsGenerating(true);
		setShowAIQuestions(false);

		const vibeContext =
			userVibes.length > 0
				? ". Ưu tiên: " + userVibes.map((v) => v.label).join(", ")
				: "";

		const payload = {
			stops: stops.map((s) => ({
				id: s.id || s.poi_id,
				name: s.name,
				latitude: s.latitude,
				longitude: s.longitude,
			})),
			prompt_text: goalText.trim() + vibeContext,
		};

		try {
			const response = await fetch(
				`${getApiBase()}/api/smart-itinerary/`,
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
			const suggestionsList = (result.routes || []).map((r) => ({
				id: r.id,
				label: r.label,
				theme: r.theme,
				description: r.description,
				ai_reason: r.ai_reason,
				duration_text: r.duration_text,
				total_stops: r.total_stops,
				totalDuration: r.duration_text || "Chưa rõ",
				totalDistance: r.distance_text || "Chưa rõ",
				waypoints: r.waypoints || [],
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
			onRouteSuggestionsChange([]);
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

	const handleShareRoute = async (route) => {
		try {
			setShareState({
				routeId: route.id,
				status: "loading",
				message: "Đang tạo link chia sẻ...",
			});
			const response = await fetch(`${getApiBase()}/api/shared-routes/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					route,
					stops,
					prompt_text: goalText.trim(),
					created_from: "frontend",
				}),
			});

			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const result = await response.json();
			const shareUrl = `${window.location.origin}/share/${result.share_id}`;

			try {
				await navigator.clipboard.writeText(shareUrl);
			} catch {
				window.prompt("Copy link chia sẻ", shareUrl);
			}

			setShareState({
				routeId: route.id,
				status: "success",
				message: "Đã tạo link và copy vào clipboard.",
			});
		} catch (error) {
			setShareState({
				routeId: route.id,
				status: "error",
				message: "Không tạo được link chia sẻ.",
			});
		}
	};

	const displayDetail = detailLocation ?? selectedLocation;

	return (
		<>
			{/* Nút mở/đóng Sidebar */}
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
				<div className="w-[28rem] h-full flex flex-col text-slate-100 overflow-hidden">
					{/* Thanh menu Tab */}
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
						{/*LÊN KẾ HOẠCH */}
						<div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === "plan" ? "" : "hidden"}`}>
							<div className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col custom-scrollbar">
								<div className="space-y-3 relative shrink-0">
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
													onClick={() => handleSelectLocation(loc)}
												>
													<span className="font-medium text-blue-100">
														{loc.name}
													</span>
													<span className="text-xs text-slate-500 truncate block">
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
												<MapPin size={16} className="mr-2" />
												Chọn
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => openDetail(selectedLocation)}
												className="flex-1 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
											>
												<Info size={16} className="mr-2" />
												Chi tiết
											</Button>
										</div>
									)}
								</div>

								{stops.map((s, i) => {
									const isLast = i === stops.length - 1;
									const isDuplicate = duplicateId === (s.id || s.poi_id);

									return (
										<div
											key={`${s.id}-${i}`}
											className={`flex flex-col text-sm text-slate-300 bg-slate-800/40 p-3 rounded-xl transition-all group border border-transparent shrink-0 ${
												isDuplicate
													? "animate-shake ring-2 ring-yellow-500/50 bg-yellow-500/10"
													: "hover:bg-slate-800/60 hover:border-slate-700/50 shadow-sm shadow-black/20"
											}`}
										>
											<div className="flex items-start gap-3 min-w-0">
												<div className="flex flex-col items-center shrink-0 pt-1.5">
													<div
														className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-slate-600"} ring-2 ring-slate-900`}
													/>
													{!isLast && (
														<div className="w-0.5 h-8 bg-slate-800/80 mt-1.5" />
													)}
												</div>

												<div className="flex-1 min-w-0">
													<p className="text-slate-200 text-sm leading-relaxed font-normal line-clamp-2">
														{s.address || s.name}
													</p>
												</div>
											</div>

											<div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-700/30 shrink-0">
												<button
													type="button"
													onClick={() => onFocusLocation({ ...s, _t: Date.now() })}
													className="flex items-center gap-1 px-2 py-1 hover:bg-slate-700 rounded text-[11px] text-slate-400 hover:text-blue-400 transition-colors"
												>
													<LocateFixed size={13} />
													<span>Vị trí</span>
												</button>
												<button
													type="button"
													onClick={() => openDetail(s)}
													className="flex items-center gap-1 px-2 py-1 hover:bg-slate-700 rounded text-[11px] text-slate-400 hover:text-blue-400 transition-colors"
												>
													<Info size={13} />
													<span>Chi tiết</span>
												</button>
												<div className="w-px h-3 bg-slate-700 mx-0.5"></div>
												<button
													type="button"
													onClick={() => removeStop(i)}
													className="flex items-center gap-1 px-2 py-1 hover:bg-red-900/30 rounded text-[11px] text-slate-400 hover:text-red-400 transition-colors"
												>
													<Trash2 size={13} />
													<span>Xóa</span>
												</button>
											</div>
										</div>
									);
								})}

								<hr className="border-slate-800 shrink-0" />

								<div className="space-y-2 shrink-0">
									<Label htmlFor="goal-text" className="text-slate-400 text-xs uppercase tracking-wider">
										Kế hoạch bạn muốn thực hiện
									</Label>
									<textarea
										id="goal-text"
										value={goalText ?? ""}
										rows={3}
										maxLength={300}
										onChange={(e) => setGoalText(e.target.value)}
										placeholder="VD: Muốn lộ trình tham quan quận 1 trong 1 buổi chiều..."
										className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[84px]"
									/>
									<p className="text-[11px] text-slate-500 text-right">
										{(goalText ?? "").length}/300
									</p>
								</div>
								
								<hr className="border-slate-800 shrink-0" />

								{/* VIBES */}
								<div className="space-y-2 shrink-0">
									<div className="flex items-center justify-between">
										<Label className="text-slate-400 text-xs uppercase tracking-wider">
											Sở thích của bạn
										</Label>
										<button
											type="button"
											onClick={() => navigate("/onboarding")}
											className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
										>
											✏️ Chỉnh sửa
										</button>
									</div>

									{userVibes.length > 0 ? (
										<div className="flex flex-wrap gap-1.5">
											{userVibes.map((vibe) => (
												<span
													key={vibe.id}
													className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full"
												>
													{vibe.icon} {vibe.label}
												</span>
											))}
										</div>
									) : (
										<button
											type="button"
											onClick={() => navigate("/onboarding")}
											className="w-full text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg py-2 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
										>
											+ Thêm sở thích để AI gợi ý chính xác hơn
										</button>
									)}
								</div>

								{/* CÂU HỎI AI CỦA NHÓM}
								{showAIQuestions && (
									<>
										<hr className="border-slate-800 shrink-0" />
										<AIClarification
											aiQuestions={aiQuestions}
											currentQuestionIndex={currentQuestionIndex}
											setCurrentQuestionIndex={setCurrentQuestionIndex}
											aiAnswers={aiAnswers}
											setAIAnswers={setAIAnswers}
											otherAnswer={otherAnswer}
											setOtherAnswer={setOtherAnswer}
										/>
									</>
								)} */}

								<div className="mt-auto pt-2 pb-1 shrink-0">
									<Button
										type="button"
										disabled={isGenerating || stops.length < 1}
										className={`w-full text-md py-6 transition-all duration-500 overflow-hidden relative group ${
											isGenerating
												? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
												: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
										}`}
										onClick={showAIQuestions ? handleFinishAIQuestions : runSmartItinerary}
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
												{showAIQuestions ? "Gợi ý ngay" : "Gợi ý lộ trình"}
											</>
										)}
									</Button>
								</div>
							</div>
						</div>

						{/*CHI TIẾT */}
						<div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === "detail" ? "" : "hidden"}`}>
							<div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-900/10 space-y-4">
								{displayDetail ? (
									<div className="space-y-4">
										<div className="space-y-3">
											<div
												className="w-full h-48 bg-slate-800 rounded-2xl overflow-hidden relative shadow-2xl group border border-slate-700/50 cursor-zoom-in"
												onClick={() => setPreviewImage(displayDetail.image)}
											>
												<img
													src={resolveImageUrl(heroImageOverride || displayDetail.image)}
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
											<Label className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">Địa chỉ</Label>
											<p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
												{displayDetail.address || "???"}
											</p>
										</div>

										{displayDetail.image_list && displayDetail.image_list.length > 1 && (
											<div className="space-y-2">
												<Label className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">
													Thông tin thêm
												</Label>
												<div className="grid grid-cols-4 gap-2">
													{displayDetail.image_list.slice(1).map((img, idx) => (
														<div
															key={idx}
															className="aspect-square rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-blue-500 transition-all active:scale-95 shadow-lg group"
															onClick={() => setHeroImageOverride(img)}
														>
															<img
																src={resolveImageUrl(img)}
																className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
																alt="thumbnail"
															/>
														</div>
													))}
												</div>
											</div>
										)}

										<div className="space-y-1">
											<Label className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">Mô tả</Label>
											<p className="text-sm text-slate-400 leading-relaxed bg-slate-800/20 p-3 rounded-lg border border-slate-800/50">
												{displayDetail.description || "Địa điểm gợi ý trong đồ án..."}
											</p>
										</div>
										<Button
											type="button"
											className="w-full mt-4 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 transition-colors"
											onClick={() => {
												if (!displayDetail) return;
												onStopsChange([displayDetail]);
												onFocusLocation?.(displayDetail);
												setActiveTab("plan");
											}}
										>
											Chọn bắt đầu từ đây
										</Button>
									</div>
								) : (
									<div className="flex flex-col items-center justify-center min-h-[280px] text-slate-500 space-y-4 opacity-50 px-10">
										<Info size={48} className="opacity-20" />
										<p className="text-center text-sm">Chưa chọn địa điểm.</p>
									</div>
								)}
							</div>
						</div>

						{/*KẾT QUẢ */}
						<div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === "results" ? "" : "hidden"}`}>
							<div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/10 space-y-4 min-h-0">
								{routeSuggestions.length === 0 ? (
									<div className="py-16 text-center text-slate-500 text-sm">
										Chưa có gợi ý. Hãy bấm &quot;Gợi ý lộ trình&quot; ở tab Lên kế hoạch.
									</div>
								) : (
									<ul className="space-y-3">
										{routeSuggestions.map((r) => {
											const isOn = selectedSuggestionId === r.id;
											const isExpanded = expandedRouteId === r.id;
											return (
												<li key={r.id} className={`rounded-xl border transition-colors ${isOn ? "border-blue-500/50 bg-slate-800/40" : "border-slate-800 bg-slate-900/30"}`}>
													<div className="flex gap-3 p-3 items-start">
														<button
															type="button"
															onClick={() => selectRouteSuggestion(r)}
															className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-colors ${isOn ? "border-blue-400 bg-blue-500" : "border-slate-500 bg-transparent"}`}
														/>
														<div className="flex-1 min-w-0 space-y-2">
															<div className="flex items-center justify-between gap-2">
																<h3 className="text-sm font-semibold text-slate-100">{r.label}</h3>
																<div className="flex items-center gap-2 shrink-0">
																	<span className="text-[10px] uppercase text-slate-500 shrink-0">
																		{r.totalDuration} · {r.totalDistance}
																	</span>
																	<Button
																		type="button"
																		variant="outline"
																		size="xs"
																		onClick={() => handleShareRoute(r)}
																		disabled={shareState.routeId === r.id && shareState.status === "loading"}
																		className="border-slate-700 bg-slate-800/90 text-slate-100"
																	>
																		{shareState.routeId === r.id && shareState.status === "success" ? <Check size={12} className="mr-1" /> : <Share2 size={12} className="mr-1" />}
																		Chia sẻ
																	</Button>
																</div>
															</div>
															
															<p className="text-xs text-slate-400 leading-relaxed">
																{r.waypoints.map((w, idx) => (
																	<span key={`${r.id}-${w.id}-${idx}`}>
																		{idx > 0 && <span className="text-slate-600"> → </span>}
																		<button type="button" className="text-blue-300 hover:underline font-medium" onClick={() => openDetail(w)}>
																			{w.name}
																		</button>
																	</span>
																))}
															</p>

															<button
																type="button"
																className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
																onClick={() => setExpandedRouteId(isExpanded ? null : r.id)}
															>
																<ChevronDown className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} size={14} />
																{isExpanded ? "Thu gọn" : "Chi tiết"}
															</button>
														</div>
													</div>

													{isExpanded && (
														<div className="px-4 pb-4 pt-3 text-xs text-slate-400 space-y-3 border-t border-slate-800/80 bg-slate-900/30 rounded-b-xl">
															<div className="space-y-1.5">
																<div className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase text-[10px] tracking-wider">
																	<Sparkles size={12} /> Góc nhìn AI
																</div>
																<p className="text-slate-300 italic border-l-2 border-blue-500/30 pl-3">
																	&quot;{r.ai_reason}&quot;
																</p>
															</div>
															<div className="pt-2 border-t border-slate-800/50">
																<span className="text-slate-500 font-medium">Lý do: </span>{r.description}
															</div>
														</div>
													)}
												</li>
											);
										})}
									</ul>
								)}
							</div>
						</div>
					</div>

					{/* KHU VỰC NGƯỜI DÙNG Ở ĐÁY SIDEBAR */}
					<div className="mt-auto p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between gap-3">
						
						{/*Hiển thị Avatar & Họ Tên*/}
						<button 
							onClick={() => setIsProfileOpen(true)}
							className="flex-1 flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all shadow-md border border-slate-700 group"
						>
							<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
								{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
							</div>
							<span className="text-sm font-medium text-white truncate max-w-[130px] group-hover:text-blue-400 transition-colors">
								{user?.displayName || user?.email || "Người dùng"}
							</span>
						</button>

						{/*Nút Đăng xuất*/}
						<button 
							onClick={handleLogout}
							className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold transition-all shadow-sm border border-red-500/20"
						>
							Đăng xuất
						</button>
					</div>
					
				</div>
			</aside>
			
			<ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

			{/* HIỆU ỨNG AI*/}
			{isGenerating && (
				<div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/40 backdrop-blur-md transition-all duration-500 animate-in fade-in">
					<div className="relative flex flex-col items-center">
						<div className="absolute -inset-20 bg-blue-500/10 blur-[100px] rounded-full animate-pulse-glow"></div>
						<div className="absolute -inset-10 bg-indigo-500/5 blur-[60px] rounded-full animate-pulse-glow" style={{ animationDelay: "-1s" }}></div>
						<div className="relative">
							<div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
							<div className="relative bg-slate-900/80 border border-blue-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.2)] flex flex-col items-center gap-6 backdrop-blur-xl">
								<div className="relative w-20 h-20">
									<div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
									<div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
									<div className="absolute inset-2 border-2 border-blue-400/20 rounded-full animate-spin-slow"></div>
									<div className="absolute inset-0 flex items-center justify-center">
										<MapPinned className="text-blue-400 animate-pulse" size={36} strokeWidth={1.5} />
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
							</div>
						</div>
					</div>
				</div>
			)}

			{/* XEM ẢNH FULL MÀN HÌNH */}
			{previewImage && (
				<div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
					<Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full" onClick={() => setPreviewImage(null)}>
						<X size={28} />
					</Button>
					<img src={resolveImageUrl(previewImage)} className="max-w-full max-h-full object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300" alt="Preview" />
				</div>
			)}
		</>
	);
}