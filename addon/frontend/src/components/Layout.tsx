import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import CatalogStatusBanner from "./CatalogStatusBanner";

export default function Layout() {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <CatalogStatusBanner />

      {/* pb-20 leaves room for the fixed bottom nav bar */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
