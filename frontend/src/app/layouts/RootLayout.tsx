import { Outlet } from "react-router";

export function RootLayout() {
  return (
    <>
      <header>Header</header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
