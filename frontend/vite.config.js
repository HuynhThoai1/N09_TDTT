import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin-allow-popups",
		},
		host: "0.0.0.0", // Cho phép truy cập từ thiết bị khác trong cùng mạng
		port: 5173,
	},
});
