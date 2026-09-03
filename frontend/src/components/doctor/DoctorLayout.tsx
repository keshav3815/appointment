import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDoctorAuth } from "../../context/DoctorAuthContext";

export function DoctorLayout() {
  const location = useLocation();
  const isLogin = location.pathname === "/doctor/login";
  const { doctor, logout } = useDoctorAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/doctor/login");
  };

  return (
    <div className="admin-theme min-h-screen bg-[var(--admin-dark)] text-[var(--admin-text)]">
      {isLogin ? (
        <Outlet />
      ) : (
        <>
          <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--admin-border)] bg-[var(--admin-dark-2)]">
            <div className="flex items-center gap-2 font-bold text-[1.05rem]">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.95rem]"
                style={{ background: "linear-gradient(135deg, var(--admin-primary), var(--admin-accent))" }}
              >
                Dr
              </span>
              Doctor Portal
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[0.88rem] text-[var(--admin-text-muted)]">{doctor?.full_name}</span>
              <button
                onClick={handleLogout}
                className="text-[0.82rem] font-semibold text-[var(--admin-text-muted)] border border-[var(--admin-border)] rounded-lg px-3 py-1.5 hover:text-white hover:border-white/30"
              >
                Log Out
              </button>
            </div>
          </header>
          <main className="p-5 max-w-5xl mx-auto">
            <Outlet />
          </main>
        </>
      )}
    </div>
  );
}
