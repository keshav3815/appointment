import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/appointments": "Appointments",
  "/admin/patients": "Patients",
  "/admin/payments": "Payments",
  "/admin/settings": "Settings",
};

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLogin = location.pathname === "/admin/login";

  return (
    <div className="admin-theme min-h-screen bg-[var(--admin-dark)] text-[var(--admin-text)]">
      {isLogin ? (
        <Outlet />
      ) : (
        <>
          <Sidebar open={sidebarOpen} />
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="lg:pl-[260px]">
            <Topbar
              title={PAGE_TITLES[location.pathname] ?? "Admin"}
              onToggleSidebar={() => setSidebarOpen((o) => !o)}
            />
            <main className="p-5">
              <Outlet />
            </main>
          </div>
        </>
      )}
    </div>
  );
}
