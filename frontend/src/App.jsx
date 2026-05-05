import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainPage from "./pages/MainPage";
<<<<<<< develop_Vu
import SharedRoutePage from "./pages/SharedRoutePage";
=======
import OnboardingPage from "./pages/OnboardingPage";

>>>>>>> main
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
