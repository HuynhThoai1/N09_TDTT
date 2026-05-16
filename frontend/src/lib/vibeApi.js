import { auth } from "../firebase";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getVibeTags() {
    const res = await fetch(`${BASE_URL}/api/vibes/`, {
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Không thể tải danh sách Vibe");
    return res.json();
}

export async function saveUserVibes(vibeIds) {
    // Luôn lưu localStorage làm fallback cho guest
    localStorage.setItem('guest_vibe_ids', JSON.stringify(vibeIds));

    // Lấy thông tin đầy đủ các thẻ để hiển thị trên Sidebar
    const allGroups = await getVibeTags();
    const allTags = allGroups.flatMap(g => g.tags);
    const selectedTags = allTags.filter(t => vibeIds.includes(t.id));
    localStorage.setItem('guest_vibes', JSON.stringify(selectedTags));

    // Nếu đã đăng nhập → Gửi lên backend để lưu vào Django DB
    if (auth.currentUser) {
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${BASE_URL}/api/profile/vibes/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ vibe_ids: vibeIds }),
            });
            if (!res.ok) {
                console.error("[VibeAPI] Lưu vibes lên server thất bại:", res.status);
            } else {
                console.log("[VibeAPI] Đã lưu vibes lên server thành công!");
            }
        } catch (err) {
            console.error("[VibeAPI] Lỗi khi gửi vibes lên server:", err);
        }
    }

    return { message: "Đã lưu sở thích!" };
}

export async function getUserVibes() {
    // Nếu đã đăng nhập → Thử load từ backend trước
    if (auth.currentUser) {
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${BASE_URL}/api/profile/vibes/`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                // Backend trả về profile có trường vibes
                if (data.vibes && data.vibes.length > 0) {
                    // Đồng bộ ngược lại localStorage
                    localStorage.setItem('guest_vibes', JSON.stringify(data.vibes));
                    localStorage.setItem('guest_vibe_ids', JSON.stringify(data.vibes.map(v => v.id)));
                    return { vibes: data.vibes };
                }
            }
        } catch (err) {
            console.error("[VibeAPI] Lỗi khi load vibes từ server:", err);
        }
    }

    // Fallback: Đọc từ localStorage (cho guest hoặc khi server lỗi)
    const stored = localStorage.getItem('guest_vibes');
    const vibes = stored ? JSON.parse(stored) : [];
    return { vibes };
}