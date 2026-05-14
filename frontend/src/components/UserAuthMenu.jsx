import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import ProfileModal from "./ProfileModal";
import { User } from "lucide-react";

export default function UserAuthMenu() {
    const [user, setUser] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Lắng nghe trạng thái đăng nhập từ Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Xử lý sự kiện đăng xuất
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsProfileOpen(false);
            navigate('/login');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    };

    if (loading) return null; // Hoặc hiển thị skeleton/spinner nhỏ gọn

    return (
        <>
            <div className="absolute top-4 right-4 z-[1001]">
                {!user ? (
                    // Trạng thái chưa đăng nhập: Hiển thị cục tròn và chữ "Đăng nhập"
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full shadow-md border border-slate-200 transition-all font-medium text-sm group"
                        title="Đăng nhập"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                            <User size={16} />
                        </div>
                        <span className="pr-1">Đăng nhập</span>
                    </button>
                ) : (
                    // Trạng thái đã đăng nhập: Chỉ hiển thị Avatar (Logo hình tròn)
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 transition-all active:scale-95"
                        title={user.displayName || user.email || "Hồ sơ cá nhân"}
                    >
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </button>
                )}
            </div>

            {/* Modal hồ sơ cá nhân */}
            {user && (
                <ProfileModal 
                    isOpen={isProfileOpen} 
                    onClose={() => setIsProfileOpen(false)} 
                    onLogout={handleLogout} 
                />
            )}
        </>
    );
}
