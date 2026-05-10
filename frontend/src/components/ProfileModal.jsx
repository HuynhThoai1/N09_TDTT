import { useState } from "react";
import { auth } from "../firebase";
import { updateProfile, updatePassword } from "firebase/auth";
import { X, User, Lock, CheckCircle } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { Input } from "./ui/input.jsx";

export default function ProfileModal({ isOpen, onClose }) {
    const user = auth.currentUser;
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    if (!isOpen) return null;

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            // Cập nhật Tên hiển thị
            if (displayName !== user.displayName) {
                await updateProfile(user, { displayName });
            }

            // Cập nhật Mật khẩu 
            if (newPassword.length > 0) {
                if (newPassword.length < 6) {
                    throw new Error("Mật khẩu phải ít nhất 6 ký tự");
                }
                await updatePassword(user, newPassword);
            }

            setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
            setTimeout(onClose, 2000); // Đóng modal sau 2s
        } catch (error) {
            console.error(error);
            let errMsg = "Có lỗi xảy ra, vui lòng thử lại.";
            if (error.code === "auth/requires-recent-login") {
                errMsg = "Vui lòng đăng xuất và đăng nhập lại để đổi mật khẩu.";
            }
            setMessage({ type: "error", text: errMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="text-blue-400" size={20} /> Hồ sơ cá nhân
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-slate-500 font-bold tracking-widest">Email (Không thể đổi)</label>
                        <Input value={user?.email} disabled className="bg-slate-800 border-slate-700 text-slate-400" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase text-slate-500 font-bold tracking-widest">Tên hiển thị</label>
                        <Input 
                            value={displayName} 
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Nhập tên của bạn..."
                            className="bg-slate-900 border-slate-700 text-white focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase text-slate-500 font-bold tracking-widest">Mật khẩu mới (Để trống nếu không đổi)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <Input 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pl-10 bg-slate-900 border-slate-700 text-white focus:ring-blue-500"
                                placeholder="******"
                            />
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                            {message.type === "success" && <CheckCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <div className="pt-2">
                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6">
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}