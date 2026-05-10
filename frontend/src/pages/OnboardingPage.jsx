import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase"; 

const MAX_VIBES = 5;

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);       
    const [selected, setSelected] = useState([]);   
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    //Lấy dữ liệu thẻ Vibes từ Backend khi mở trang
    useEffect(() => {
        fetch("http://127.0.0.1:8000/api/vibes/")
            .then(res => res.json())
            .then(data => {
                // Vì Backend đã nhóm sẵn theo category_label, ta chỉ cần gán thẳng
                // Chuyển đổi một chút để map đúng với biến 'groups' trong giao diện
                const formattedGroups = data.map(group => ({
                    category: group.category_label, // Lấy nhãn có icon (🍲 Ẩm thực)
                    tags: group.tags
                }));
                setGroups(formattedGroups);
                setLoading(false);
            })
            .catch(() => {
                setError("Không tải được danh sách sở thích.");
                setLoading(false);
            });
    }, []);

    // Hàm xử lý khi bấm chọn 1 thẻ
    const toggleVibe = (id) => {
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

    // Hàm Gửi dữ liệu lên Backend kèm TOKEN FIREBASE (
    const handleSubmit = async () => {
        if (selected.length === 0) {
            alert('Vui lòng chọn ít nhất 1 sở thích!');
            return;
        }
        
        setSaving(true);
        try {
            // Kiểm tra đăng nhập
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("Vui lòng đăng nhập trước khi chọn Vibes!");
                navigate('/login');
                return;
            }

            // Lấy Token từ Firebase
            const token = await currentUser.getIdToken();

            // Gọi API lưu Vibes với Token trong Header
            const response = await fetch('http://127.0.0.1:8000/api/profile/vibes/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Bơm Token vào đây
                },
                body: JSON.stringify({ vibe_ids: selected })
            });

            if (!response.ok) throw new Error('Lỗi khi lưu vào DB');

            console.log('Lưu thành công:', selected);
            navigate('/'); // Lưu xong chuyển về bản đồ chính

        } catch (err) {
            console.error(err);
            setError('Có lỗi xảy ra khi lưu sở thích.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-2 text-slate-800">Chọn Sở Thích Của Bạn</h1>
            <p className="text-slate-500 mb-8">Giúp AI gợi ý lộ trình du lịch phù hợp nhất (Chọn tối đa 5)</p>
            
            <div className="w-full max-w-3xl space-y-6">
                {groups.map((group, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold mb-4 text-slate-700">
                            {group.category}
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {group.tags.map(tag => {
                                const isSelected = selected.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleVibe(tag.id)}
                                        className={`px-4 py-2 rounded-full border transition-all duration-200 ${
                                            isSelected 
                                            ? "bg-blue-500 text-white border-blue-500 shadow-md scale-105" 
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                        }`}
                                    >
                                        {tag.icon} {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {error && <p className="mt-6 text-red-500 font-medium">{error}</p>}

            <div className="mt-10 flex flex-col items-center gap-4">
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-10 py-3 bg-blue-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? "Đang lưu..." : "Bắt đầu khám phá →"}
                </button>
                
                <button 
                    onClick={() => navigate("/")} 
                    className="text-sm text-slate-400 hover:text-slate-600 underline"
                >
                    Bỏ qua, làm sau
                </button>
            </div>
        </div>
    );
}