import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MapView from "@/components/Map/MapView";
import { BadgeCheck, Copy, Eye, Link2, MapPinned, Sparkles } from "lucide-react";

const getApiBase = () => {
	if (typeof window === "undefined") return "http://localhost:8000";
	return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const sharedRouteDataCache = new Map();

const upsertMeta = (selector, attribute, content) => {	let tag = document.head.querySelector(selector);
	if (!tag) {
		tag = document.createElement("meta");
		document.head.appendChild(tag);
	}
	tag.setAttribute(attribute, content);
};

export default function SharedRoutePage() {
	const { shareId } = useParams();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [shareData, setShareData] = useState(null);
	const [copyState, setCopyState] = useState("idle");

	useEffect(() => {
		let alive = true;

		const loadSharedRoute = async () => {
			try {
				setLoading(true);
				const cacheEntry = sharedRouteDataCache.get(shareId);
				const dataPromise = cacheEntry?.promise ?? (async () => {
					const response = await fetch(`${getApiBase()}/api/shared-routes/${shareId}/`);
					if (!response.ok) {
						throw new Error("Route không tồn tại");
					}
					return response.json();
				})();

				if (!cacheEntry) {
					sharedRouteDataCache.set(shareId, { promise: dataPromise, startedAt: Date.now() });
				}

				const data = await dataPromise;
				if (alive) {
					setShareData(data);
					setError("");
				}
			} catch (err) {
				if (alive) {
					setError("Không tìm thấy route chia sẻ hoặc route đã bị xoá.");
				}
			} finally {
				sharedRouteDataCache.delete(shareId);
				if (alive) setLoading(false);
			}
		};

		loadSharedRoute();
		return () => {
			alive = false;
		};
	}, [shareId]);

	const route = shareData?.route_data?.route || shareData?.route_data?.selectedRoute || shareData?.route_data || null;
	const shareUrl = `${window.location.origin}/share/${shareId}`;
	const routeTitle = route?.label || "Lộ trình được chia sẻ";
	const routeDescription = route?.description || "Xem bản đồ, các điểm dừng và vibe của chuyến đi này ở chế độ chỉ-đọc.";
	const isTrending = (shareData?.view_count ?? 0) >= 5;
	const routeCount = route?.waypoints?.length ?? 0;
	const ogImage = `https://dummyimage.com/1200x630/07111f/ffffff.png&text=${encodeURIComponent(routeTitle)}`;

	useEffect(() => {
		document.title = `${routeTitle} | Vibe Share`;

		upsertMeta('meta[name="description"]', 'content', routeDescription);
		upsertMeta('meta[property="og:title"]', 'content', routeTitle);
		upsertMeta('meta[property="og:description"]', 'content', routeDescription);
		upsertMeta('meta[property="og:type"]', 'content', 'website');
		upsertMeta('meta[property="og:url"]', 'content', shareUrl);
		upsertMeta('meta[property="og:image"]', 'content', ogImage);
		upsertMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
		upsertMeta('meta[name="twitter:title"]', 'content', routeTitle);
		upsertMeta('meta[name="twitter:description"]', 'content', routeDescription);
		upsertMeta('meta[name="twitter:image"]', 'content', ogImage);
	}, [routeTitle, routeDescription, shareUrl, ogImage]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopyState("copied");
			setTimeout(() => setCopyState("idle"), 1500);
		} catch {
			window.prompt("Copy link chia sẻ", shareUrl);
		}
	};

	return (
		<div className="relative h-screen w-full overflow-hidden bg-[#07111f] text-white">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(135deg,_#07111f_0%,_#0f172a_60%,_#020617_100%)]" />
			<div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />

			{loading ? (
				<div className="relative z-10 flex h-full items-center justify-center">
					<div className="rounded-3xl border border-white/10 bg-slate-950/70 px-6 py-5 shadow-2xl backdrop-blur-xl">
						<p className="text-sm text-slate-300">Đang tải lộ trình chia sẻ...</p>
					</div>
				</div>
			) : error ? (
				<div className="relative z-10 flex h-full items-center justify-center p-6">
					<div className="max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl backdrop-blur-xl">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
							<MapPinned size={28} />
						</div>
						<h1 className="text-2xl font-semibold">Không mở được route</h1>
						<p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
						<p className="mt-4 text-xs text-slate-500">ID: {shareId}</p>
					</div>
				</div>
			) : (
				<>
					<MapView focusedLocation={null} route={route} shortestPath={false} onShortestPathChange={() => {}} onFocusLocation={() => {}} recenterKey={0} />

					<div className="pointer-events-none absolute left-4 top-4 z-20 w-[24rem] max-w-[calc(100vw-2rem)]">
						<div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2 text-blue-300">
									<Sparkles size={16} />
									<span className="text-[11px] font-semibold uppercase tracking-[0.28em]">Vibe Share</span>
								</div>
								<div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${isTrending ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"}`}>
									{isTrending ? "Trending" : "Fresh"}
								</div>
							</div>

							<div className="mt-3 flex items-start justify-between gap-3">
								<div className="min-w-0">
									<h1 className="text-2xl font-bold tracking-tight line-clamp-2">{routeTitle}</h1>
									<p className="mt-2 text-sm leading-6 text-slate-300">{routeDescription}</p>
									<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
										<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{routeCount} điểm dừng</span>
										<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{shareData?.view_count ?? 0} lượt xem</span>
										<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Read-only</span>
									</div>
								</div>
								<div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right shrink-0">
									<div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
										<BadgeCheck size={12} />
										Read-only
									</div>
									<div className="mt-1 text-[11px] text-slate-400 flex items-center justify-end gap-1">
										<Eye size={12} />
										{shareData?.view_count ?? 0} lượt xem
									</div>
								</div>
							</div>

							<div className="mt-4">
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
										<Link2 size={14} />
										Chia sẻ link
									</div>
									<div className="mt-2 flex items-center gap-2">
										<div className="flex-1 truncate rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">{shareUrl}</div>
										<Button type="button" variant="outline" size="sm" onClick={handleCopy} className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700">
											<Copy size={14} className="mr-1" />
											{copyState === "copied" ? "Đã copy" : "Copy"}
										</Button>
									</div>
									<p className="mt-2 text-[11px] text-slate-500">Dán link này để bạn bè xem đúng lộ trình của bạn trên web chỉ-đọc.</p>
								</div>
							</div>

							<div className="mt-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Điểm dừng</div>
									<div className="text-[11px] text-slate-500">{routeCount} stops</div>
								</div>
								<div className="max-h-72 overflow-y-auto space-y-2 pr-1 no-scrollbar">
									{(route?.waypoints || []).map((stop, index) => (
										<div key={`${stop.id || stop.poi_id || index}`} className="rounded-2xl border border-white/8 bg-slate-900/70 p-3">
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">#{index + 1}</div>
													<div className="mt-1 text-sm font-medium text-slate-100">{stop.name}</div>
												</div>
												<div className="text-[11px] text-slate-500 text-right">{stop.category || "Địa danh"}</div>
											</div>
											{stop.address && <div className="mt-2 text-xs leading-5 text-slate-400">{stop.address}</div>}
										</div>
									))}
								</div>
							</div>

							{route?.ai_reason && (
								<div className="mt-4 rounded-2xl border border-blue-400/15 bg-blue-400/10 p-4">
									<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
										<Sparkles size={14} />
										Vibe của chuyến đi
									</div>
									<p className="mt-2 text-sm leading-6 text-slate-200 italic">{route.ai_reason}</p>
								</div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
