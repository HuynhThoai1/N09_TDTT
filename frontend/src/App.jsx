import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainPage from "./pages/MainPage";
import SharedRoutePage from "./pages/SharedRoutePage";
import OnboardingPage from "./pages/OnboardingPage";

const router = createBrowserRouter([
	//Sau này có thêm các trang khác nếu muốn
	{
		path: "/about",
		element: <h1>Đây là trang giới thiệu</h1>,
	},
	{
		path: "/share/:shareId",
		element: <SharedRoutePage />,
	},
	{
		path: "/",
		element: <MainPage />,
	},
	{
		path: "/onboarding",
		element: <OnboardingPage />,
	},
]);

function App() {
	return <RouterProvider router={router}></RouterProvider>;
}

export default App;
