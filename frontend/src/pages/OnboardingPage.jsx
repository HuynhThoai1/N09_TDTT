import { useEffect, useState } from "react";
import { getVibeTags, saveUserVibes } from "../lib/vibeApi";

const MAX_VIBES = 5;

/**
 * Modal chọn sở thích (Vibe Tags).
 * @param {boolean} isOpen - Có đang mở hay không
 * @param {function} onClose - Callback đóng modal
 * @param {boolean} required - Nếu true: bắt buộc chọn ≥1 tag, không bỏ qua, không click ngoài đóng (dùng cho lần đầu đăng ký)
 */
export default function OnboardingModal({ isOpen, onClose, required = false }) {
    const [groups, setGroups] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        
        // Nếu mode bắt buộc (đăng ký mới), không load thẻ cũ để người dùng phải tự chọn lại từ đầu
        if (!required) {
            const stored = localStorage.getItem('guest_vibe_ids');
            if (stored) setSelected(JSON.parse(stored));
        } else {
            setSelected([]);
        }

        setLoading(true);
        getVibeTags()
            .then(setGroups)
            .catch(() => setError("Không tải được danh sách sở thích."))
            .finally(() => setLoading(false));
    }, [isOpen]);

    function toggleVibe(id) {
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(v => v !== id);
            if (prev.length >= MAX_VIBES) {
                setError(`Chỉ được chọn tối đa ${MAX_VIBES} thẻ!`);
                return prev;
            }
            setError("");
            return [...prev, id];
        });
    };

    async function handleSubmit() {
        // Nếu mode bắt buộc, phải chọn ít nhất 1 tag
        if (required && selected.length === 0) {
            setError("Vui lòng chọn ít nhất 1 sở thích để tiếp tục!");
            return;
        }
        setSaving(true);
        try {
            await saveUserVibes(selected);
            onClose();  // Đóng modal thay vì navigate
        } catch {
            setError("Lưu thất bại, thử lại nhé!");
        } finally {
            setSaving(false);
        }
    };

    // Không render gì nếu modal đóng
    if (!isOpen) return null;

    return (
        // Overlay — background tối mờ
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
            onClick={(e) => {
                // Nếu required thì không cho click ngoài để đóng
                if (!required && e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal box */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-800 shrink-0">
                    <h1 className="text-2xl font-bold text-white">
                        {required ? "🎉 Chào mừng! Hãy chọn sở thích của bạn" : "🗺️ Chỉnh sửa sở thích"}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {required
                            ? <>Chọn từ <strong className="text-white">1</strong> đến <strong className="text-white">{MAX_VIBES} thẻ</strong> để AI gợi ý lộ trình phù hợp với bạn.</>
                            : <>Chọn tối đa <strong className="text-white">{MAX_VIBES} thẻ</strong> để AI gợi ý lộ trình phù hợp hơn.</>
                        }
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Đã chọn: {selected.length} / {MAX_VIBES}
                    </p>
                </div>

                {/* Nội dung cuộn được */}
                <div className="overflow-y-auto p-6 space-y-5 flex-1 no-scrollbar">
                    {loading ? (
                        <div className="text-center text-slate-500 py-10">Đang tải...</div>
                    ) : (
                        groups.map(group => (
                            <div key={group.category_key}>
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    {group.category_label}
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {group.tags.map(tag => {
                                        const isSelected = selected.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleVibe(tag.id)}
                                                className={`
                                                    px-4 py-2 rounded-full border text-sm font-medium
                                                    transition-all duration-200 cursor-pointer
                                                    ${isSelected
                                                        ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)] scale-105"
                                                        : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
                                                    }
                                                `}
                                            >
                                                {tag.icon} {tag.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}

                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                {/* Footer — nút lưu */}
                <div className="px-6 py-4 border-t border-slate-800 shrink-0 flex gap-3">
                    {/* Chỉ hiện nút "Bỏ qua" khi KHÔNG bắt buộc */}
                    {!required && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors"
                        >
                            Bỏ qua
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || (required && selected.length === 0)}
                        className={`${required ? "w-full" : "flex-2"} px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]`}
                    >
                        {saving ? "Đang lưu..." : required ? "Xác nhận sở thích ✓" : "Lưu sở thích ✓"}
                    </button>
                </div>
            </div>
        </div>
    );
}