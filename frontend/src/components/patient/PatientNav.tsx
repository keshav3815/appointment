import { Link, useNavigate } from "react-router-dom";
import { usePatientAuth } from "../../context/PatientAuthContext";

export function PatientNav() {
  const { patient, logout } = usePatientAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-black/[0.06]">
      <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-[1.15rem] text-[var(--dark)]">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[1rem]"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            +
          </span>
          MedConnect
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-[0.9rem] font-semibold text-[var(--muted)]">
          <Link to="/doctors" className="hover:text-[var(--primary)]">
            Find Doctors
          </Link>
          {patient && (
            <Link to="/account" className="hover:text-[var(--primary)]">
              My Appointments
            </Link>
          )}
        </nav>

        {patient ? (
          <div className="flex items-center gap-3">
            <Link to="/account" className="text-[0.88rem] font-semibold text-[var(--dark)] hidden sm:block">
              Hi, {patient.full_name.split(" ")[0]}
            </Link>
            <button
              onClick={handleLogout}
              className="text-[0.85rem] font-semibold text-[var(--muted)] border border-[#e2e8f0] rounded-[var(--radius-sm)] px-3.5 py-1.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-white border-2 border-[#cbd5e1] rounded-[var(--radius-sm)] overflow-hidden">
            <Link
              to="/login"
              className="w-20 text-center text-[0.85rem] font-semibold text-[var(--dark)] py-1.5 hover:bg-[var(--light)] transition-colors"
            >
              Log In
            </Link>
            <span className="text-[#cbd5e1] text-[0.85rem]">/</span>
            <Link
              to="/signup"
              className="w-20 text-center text-[0.85rem] font-semibold text-[var(--dark)] py-1.5 hover:bg-[var(--light)] transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
