import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, facebookProvider } from "../firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup,
    sendPasswordResetEmail
} from "firebase/auth";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Mail, Lock, User, Phone, Calendar, Hash, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const navigate = useNavigate();
    const [view, setView] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        fullName: "", phone: "", email: "",
        birthDate: "", password: "", confirmPassword: ""
    });

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        setError("");
        try {
            // Gọi Firebase mở Popup
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const token = await user.getIdToken();

            // KIỂM TRA XEM ĐÃ CÓ PROFILE CHƯA 
            const checkResponse = await fetch(`http://localhost:8000/api/profile/`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!checkResponse.ok) {
                console.log("Người dùng mới hoàn toàn, đang khởi tạo Profile rỗng...");
                await fetch(`http://localhost:8000/api/profile/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        phone: "", 
                        birth_date: null 
                    })
                });
            } else {
                console.log("Đã tìm thấy dữ liệu cũ, không ghi đè.");
            }

            navigate("/");

        } catch (err) {
            console.error("Lỗi đăng nhập MXH:", err);
            if (err.code === 'auth/account-exists-with-different-credential') {
                setError("Email này đã được liên kết với một phương thức khác.");
            } else {
                setError("Đăng nhập thất bại. Vui lòng thử lại!");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
            navigate("/");
        } catch (err) {
            setError("Email hoặc mật khẩu không chính xác.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            setLoading(false); return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            await updateProfile(userCredential.user, { displayName: formData.fullName });

            // GỬI DỮ LIỆU XUỐNG DJANGO
            const token = await userCredential.user.getIdToken();
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone: formData.phone,
                    birth_date: formData.birthDate,
                })
            });

            navigate("/onboarding");
        } catch (err) {
            if (err.code === "auth/email-already-in-use") setError("Email này đã được sử dụng.");
            else if (err.code === "auth/weak-password") setError("Mật khẩu phải từ 6 ký tự trở lên.");
            else setError("Lỗi khi đăng ký, vui lòng kiểm tra lại.");
        } finally {
            setLoading(false);
        }
    };

    // XỬ LÝ QUÊN MẬT KHẨU 
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!formData.email) {
            setError("Vui lòng nhập email của bạn vào ô bên dưới.");
            return;
        }

        setLoading(true); setError(""); setSuccessMsg("");
        try {
            await sendPasswordResetEmail(auth, formData.email);
            setSuccessMsg("Đã gửi link khôi phục! Vui lòng kiểm tra hộp thư email (bao gồm cả thư rác/spam).");
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                setError("Email này chưa được đăng ký trong hệ thống.");
            } else {
                setError("Không thể gửi email khôi phục. Vui lòng thử lại sau.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        N09_TDTT
                    </h1>
                    <p className="text-slate-400 mt-2">
                        {view === 'login' && "Chào mừng trở lại! Đăng nhập để tiếp tục."}
                        {view === 'register' && "Tạo tài khoản để khám phá lộ trình AI."}
                        {view === 'forgot' && "Khôi phục mật khẩu của bạn."}
                    </p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}
                {successMsg && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm text-center">{successMsg}</div>}

                {/* FORM QUÊN MẬT KHẨU  */}
                {view === 'forgot' && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <p className="text-sm text-slate-400 text-center mb-4">
                            Nhập địa chỉ email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi một liên kết an toàn để bạn đặt lại mật khẩu.
                        </p>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Email của bạn</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <Input name="email" type="email" required onChange={handleInputChange} className="pl-10 bg-slate-950 border-slate-800 text-white" placeholder="nhapemail@gmail.com" />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-6 text-md font-medium mt-2">
                            {loading ? "Đang gửi..." : "Gửi liên kết khôi phục"}
                        </Button>
                        <button type="button" onClick={() => { setView('login'); setError(""); setSuccessMsg(""); }} className="w-full mt-4 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors">
                            <ArrowLeft size={16} className="mr-1" /> Quay lại đăng nhập
                        </button>
                    </form>
                )}

                {/* FORM ĐĂNG NHẬP */}
                {view === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <Input name="email" type="email" required onChange={handleInputChange} className="pl-10 bg-slate-950 border-slate-800 text-white" placeholder="nhapemail@gmail.com" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs text-slate-400 font-medium">Mật khẩu</label>
                                {/* NÚT QUÊN MẬT KHẨU Ở ĐÂY */}
                                <button type="button" onClick={() => { setView('forgot'); setError(""); }} className="text-xs text-blue-400 hover:text-blue-300">Quên mật khẩu?</button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <Input name="password" type="password" required onChange={handleInputChange} className="pl-10 bg-slate-950 border-slate-800 text-white" placeholder="••••••••" />
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-6 text-md font-medium mt-2">
                            {loading ? "Đang xử lý..." : "Đăng nhập"}
                        </Button>
                    </form>
                )}

                {/* FORM ĐĂNG KÝ */}
                {view === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

                        {/* Họ và Tên  */}
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Họ và tên</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input name="fullName" required onChange={handleInputChange} className="pl-9 bg-slate-950 border-slate-800 text-white text-sm h-10" placeholder="Nguyễn Văn A" />
                            </div>
                        </div>

                        {/* Số điện thoại & Ngày sinh */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Số điện thoại</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <Input name="phone" required onChange={handleInputChange} className="pl-9 bg-slate-950 border-slate-800 text-white text-sm h-10" placeholder="0901234567" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Ngày sinh</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <Input
                                        name="birthDate"
                                        type="date"
                                        required
                                        onChange={handleInputChange}
                                        className="pl-9 bg-slate-950 border-slate-800 text-white text-sm h-10 [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/*  Email */}
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input name="email" type="email" required onChange={handleInputChange} className="pl-9 bg-slate-950 border-slate-800 text-white text-sm h-10" placeholder="email@gmail.com" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input name="password" type="password" required onChange={handleInputChange} className="pl-9 bg-slate-950 border-slate-800 text-white text-sm h-10" placeholder="••••••••" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input name="confirmPassword" type="password" required onChange={handleInputChange} className="pl-9 bg-slate-950 border-slate-800 text-white text-sm h-10" placeholder="••••••••" />
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-6 text-md font-medium mt-4">
                            {loading ? "Đang xử lý..." : "Đăng ký ngay"}
                        </Button>
                    </form>
                )}

                {/*ĐĂNG NHẬP MẠNG XÃ HỘI */}
                {view === 'login' && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-900 text-slate-500">Hoặc tiếp tục với</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => handleSocialLogin(googleProvider)} className="bg-slate-950 border-slate-800 text-white hover:bg-slate-800 hover:text-white">
                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </Button>
                            <Button variant="outline" onClick={() => handleSocialLogin(facebookProvider)} className="bg-[#1877F2]/10 border-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/20 hover:text-[#1877F2]">
                                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                Facebook
                            </Button>
                        </div>
                    </>
                )}

                {/* ĐIỀU HƯỚNG */}
                {view !== 'forgot' && (
                    <div className="mt-6 text-center text-sm text-slate-400">
                        {view === 'login' ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
                        <button
                            onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(""); }}
                            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                            {view === 'login' ? "Đăng ký ngay" : "Đăng nhập"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}