import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainPage from "./pages/MainPage";
const router = createBrowserRouter([
	//Sau này có thêm các trang khác nếu muốn
	{
		path: "about",
		element: <h1>Đây là trang giới thiệu</h1>,
	},
	{
		path: "/",
		element: <MainPage />,
	},
]);

function App() {
	return <RouterProvider router={router}></RouterProvider>;
}

export default App;
