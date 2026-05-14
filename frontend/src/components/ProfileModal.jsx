import { useState, useEffect } from "react";
import { updateProfile, updatePassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../firebase"; 
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { X, User, Phone, Calendar, Mail, Lock, Camera } from "lucide-react";



export default function ProfileModal({ isOpen, onClose, onLogout }) {
    const user = auth.currentUser;
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const API_URL = "http://localhost:8000"; 

    const [imageFile, setImageFile] = useState(null); 
    const [previewUrl, setPreviewUrl] = useState(""); 

    // KÉO DỮ LIỆU TỪ DJANGO KHI MỞ MODAL 
    useEffect(() => {
        const fetchData = async () => {
            if (user && isOpen) {
                setFullName(user.displayName || "");
                try {
                    const token = await user.getIdToken();
                    const response = await fetch(`${API_URL}/api/profile/`, {
                        method: "GET",
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log("Dữ liệu lấy từ Backend:", data); 
                        setPhone(data.phone || "");
                        setBirthDate(data.birth_date || ""); 
                    } else {
                        console.error("Backend từ chối lấy dữ liệu:", response.status);
                    }
                } catch (err) {
                    console.error("Lỗi mất kết nối Backend:", err);
                }
            }
        };
        fetchData();
    }, [user, isOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const token = await user.getIdToken();
            
            // Chỉ gửi dữ liệu chữ, không gửi file nữa
            const response = await fetch(`${API_URL}/api/profile/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone: phone,
                    birth_date: birthDate
                })
            });

            if (response.ok) {
                setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
            } else {
                throw new Error("Lỗi kết nối Backend");
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: "error", text: "Có lỗi xảy ra, Tài kiểm tra lại server nhé!" });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="text-blue-500" /> Hồ sơ cá nhân
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5">
                    {message.text && (
                        <div className={`p-3 rounded-lg text-sm border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email (Không thể đổi)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <Input value={user?.email || ""} disabled className="pl-9 bg-slate-950/50 border-slate-800 text-slate-500 cursor-not-allowed" />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Họ và tên
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    required 
                                    className="pl-9 bg-slate-950 border-slate-700 text-white" 
                                />
                            </div>
                        </div>

                        {/* Số điện thoại */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Số điện thoại
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    className="pl-9 bg-slate-950 border-slate-700 text-white" 
                                    placeholder="Chưa cập nhật" 
                                />
                            </div>
                        </div>

                        {/* Ngày sinh */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Ngày sinh
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input 
                                    value={birthDate} 
                                    type="date" 
                                    onChange={(e) => setBirthDate(e.target.value)} 
                                    className="pl-9 bg-slate-950 border-slate-700 text-white [color-scheme:dark]" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-4 mt-2"></div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mật khẩu mới</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <Input 
                                type="password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                className="pl-9 bg-slate-950 border-slate-700 text-white" 
                                placeholder="Để trống nếu không muốn đổi mật khẩu..." 
                            />
                        </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-6 text-md font-semibold rounded-xl">
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                        
                        {onLogout && (
                            <Button 
                                type="button" 
                                onClick={onLogout} 
                                variant="outline"
                                className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400 py-6 text-md font-semibold rounded-xl transition-all"
                            >
                                Đăng xuất
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}