import { Navigate, Outlet } from "react-router-dom";
import { useDoctorAuth } from "../../context/DoctorAuthContext";

export function DoctorProtectedRoute() {
  const { doctor, loading } = useDoctorAuth();

  if (loading) {
    return <div className="p-8 text-[var(--admin-text)]">Loading...</div>;
  }

  if (!doctor) {
    return <Navigate to="/doctor/login" replace />;
  }

  return <Outlet />;
}
