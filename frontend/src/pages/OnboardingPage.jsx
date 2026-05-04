import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVibeTags, saveUserVibes } from "../lib/vibeApi";

const MAX_VIBES = 5;

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);   // Danh sách nhóm thẻ từ API
    const [selected, setSelected] = useState([]);   // Mảng id đã chọn
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Tải danh sách thẻ khi vào trang
    useEffect(() => {
        getVibeTags()
            .then(setGroups)
            .catch(() => setError("Không tải được danh sách sở thích."))
            .finally(() => setLoading(false));
    }, []);

    // Xử lý click thẻ
    function toggleVibe(id) {
        setSelected(prev => {
            if (prev.includes(id)) {
                return prev.filter(v => v !== id);   // Bỏ chọn
            }
            if (prev.length >= MAX_VIBES) {
                setError(`Chỉ được chọn tối đa ${MAX_VIBES} thẻ!`);
                return prev;
            }
            setError("");
            return [...prev, id];
        });
    }

    // Lưu và chuyển sang trang chính
    async function handleSubmit() {
        if (selected.length === 0) {
            setError("Vui lòng chọn ít nhất 1 thẻ sở thích!");
            return;
        }
        setSaving(true);
        try {
            await saveUserVibes(selected);
            navigate("/");   // Chuyển về trang chính sau khi lưu
        } catch {
            setError("Lưu thất bại, thử lại nhé!");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen text-gray-500">
            Đang tải...
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">

            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    🗺️ Chào mừng bạn!
                </h1>
                <p className="text-gray-500 mt-2">
                    Chọn tối đa <strong>{MAX_VIBES} thẻ</strong> sở thích để AI gợi ý lộ trình phù hợp hơn.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    Đã chọn: {selected.length} / {MAX_VIBES}
                </p>
            </div>

            {/* Bảng thẻ — chia theo nhóm */}
            <div className="w-full max-w-3xl space-y-6">
                {groups.map(group => (
                    <div key={group.category_key} className="bg-white rounded-2xl shadow p-5">

                        {/* Tên nhóm */}
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">
                            {group.category_label}
                        </h2>

                        {/* Danh sách thẻ trong nhóm */}
                        <div className="flex flex-wrap gap-2">
                            {group.tags.map(tag => {
                                const isSelected = selected.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleVibe(tag.id)}
                                        className={`
                                            px-4 py-2 rounded-full border text-sm font-medium
                                            transition-all duration-200 cursor-pointer
                                            ${isSelected
                                                ? "bg-blue-500 text-white border-blue-500 shadow-md scale-105"
                                                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                                            }
                                        `}
                                    >
                                        {tag.icon} {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Thông báo lỗi */}
            {error && (
                <p className="mt-4 text-red-500 text-sm">{error}</p>
            )}

            {/* Nút bắt đầu */}
            <button
                onClick={handleSubmit}
                disabled={saving}
                className="mt-8 px-10 py-3 bg-blue-500 text-white text-lg font-semibold
                           rounded-full shadow-lg hover:bg-blue-600 disabled:opacity-50
                           transition-all duration-200"
            >
                {saving ? "Đang lưu..." : "Bắt đầu khám phá →"}
            </button>

            {/* Bỏ qua */}
            <button
                onClick={() => navigate("/")}
                className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
            >
                Bỏ qua, làm sau
            </button>

        </div>
    );
}