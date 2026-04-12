/** Địa điểm gợi ý — dữ liệu giả lập */
export const LOCATIONS_DB = [
	{
		id: 1,
		name: "Nhà thờ Đức Bà Nhà thờ Đức Bà Nhà thờ Đức Bà",
		address: "Số 1 Công Xã Paris, Phường Bến Nghé, Quận 1",
		latitude: 10.7798,
		longitude: 106.6991,
		type: "landmark",
		image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800",
	},
	{
		id: 2,
		name: "Chợ Bến Thành",
		address: "Công trường Quách Thị Trang, Phường Bến Thành, Quận 1",
		latitude: 10.776,
		longitude: 106.6988,
		type: "market",
		image: "https://images.unsplash.com/photo-1559592443-7f87a79f6f88?auto=format&fit=crop&q=80&w=800",
	},
	{
		id: 3,
		name: "Hẻm 158 Lý Tự Trọng",
		address: "158 Lý Tự Trọng, Phường Bến Thành, Quận 1",
		latitude: 10.7735,
		longitude: 106.6961,
		type: "street_art",
		image: "https://images.unsplash.com/photo-1563801262612-42994119102c?auto=format&fit=crop&q=80&w=800",
	},
	{
		id: 4,
		name: "Cộng Cà Phê - Pasteur",
		address: "152 Pasteur, Phường Bến Nghé, Quận 1",
		latitude: 10.777,
		longitude: 106.6985,
		type: "cafe",
		image: "https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&q=80&w=800",
	},
	{
		id: 5,
		name: "Công viên Tao Đàn",
		address: "Trương Định, Phường Bến Thành, Quận 1",
		latitude: 10.7745,
		longitude: 106.6922,
		type: "park",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Cong_vien_Tao_Dan.jpg/800px-Cong_vien_Tao_Dan.jpg",
	},
	{
		id: 6,
		name: "Bảo tàng Hồ Chí Minh",
		address: "31 Nguyễn Thị Minh Khai, Quận 1 (mock)",
		latitude: 10.7765,
		longitude: 106.6955,
		type: "museum",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Bao_tang_Ho_Chi_Minh_TPHCM.jpg/800px-Bao_tang_Ho_Chi_Minh_TPHCM.jpg",
	},
	{
		id: 7,
		name: "Dinh Độc Lập",
		address: "135 Nam Kỳ Khởi Nghĩa, Quận 1",
		latitude: 10.7773,
		longitude: 106.6875,
		type: "landmark",
		image: "https://images.unsplash.com/photo-1623594002662-798836378e04?auto=format&fit=crop&q=80&w=800",
	},
	{
		id: 8,
		name: "Bảo tàng Mỹ thuật TP.HCM",
		address: "97 Phó Đức Chính, Quận 1",
		latitude: 10.7699,
		longitude: 106.7052,
		type: "museum",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Fine_Arts_Museum_Ho_Chi_Minh_City.jpg/800px-Fine_Arts_Museum_Ho_Chi_Minh_City.jpg",
	},
];

export function findLocationById(id) {
	return LOCATIONS_DB.find((l) => l.id === id) ?? null;
}
