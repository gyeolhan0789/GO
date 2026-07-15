import { createBrowserRouter } from "react-router";

import { RootLayout } from "@/app/layouts/RootLayout";
import { HomePage } from "@/pages/HomePage/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
]);
