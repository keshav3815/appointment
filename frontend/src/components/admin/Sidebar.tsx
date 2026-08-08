import { NavLink } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/appointments", label: "Appointments" },
  { to: "/admin/patients", label: "Patients" },
  { to: "/admin/payments", label: "Payments" },
];

export function Sidebar({ open }: { open: boolean }) {
  const { admin, logout } = useAdminAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
      isActive
        ? "bg-[var(--admin-primary)] text-white"
        : "text-[var(--admin-text-muted)] hover:bg-white/5 hover:text-[var(--admin-text)]"
    }`;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-[260px] bg-[var(--admin-glass)] backdrop-blur-xl border-r border-[var(--admin-border)] flex flex-col transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex items-center gap-2 px-5 py-5 font-bold text-lg text-[var(--admin-text)]">
        Admin Panel
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
        {admin?.role === "superadmin" && (
          <>
            <div className="h-px bg-[var(--admin-border)] my-2" />
            <NavLink to="/admin/settings" className={linkClass}>
              Settings
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-[var(--admin-border)]">
        <div className="flex items-center gap-2 mb-3">
          <div>
            <div className="text-sm font-semibold text-[var(--admin-text)]">{admin?.name}</div>
            <div className="text-xs text-[var(--admin-text-muted)] capitalize">{admin?.role}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full text-sm font-semibold rounded-lg py-2 border border-[var(--admin-danger)] text-[var(--admin-danger)] hover:bg-[var(--admin-danger)] hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
