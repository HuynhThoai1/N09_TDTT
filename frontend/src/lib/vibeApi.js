const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getVibeTags() {
    const res = await fetch(`${BASE_URL}/api/vibes/`, {
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Không thể tải danh sách Vibe");
    return res.json();
}

export async function saveUserVibes(vibeIds) {
    // Lưu id vào localStorage
    localStorage.setItem('guest_vibe_ids', JSON.stringify(vibeIds));

    // Lấy thông tin đầy đủ của các thẻ từ backend để lưu luôn
    const allGroups = await getVibeTags();
    const allTags = allGroups.flatMap(g => g.tags);
    const selectedTags = allTags.filter(t => vibeIds.includes(t.id));
    localStorage.setItem('guest_vibes', JSON.stringify(selectedTags));

    return { message: "Đã lưu sở thích!" };
}

export async function getUserVibes() {
    // Đọc từ localStorage thay vì gọi API
    const stored = localStorage.getItem('guest_vibes');
    const vibes = stored ? JSON.parse(stored) : [];
    return { vibes };
}