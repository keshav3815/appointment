import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export function ProtectedRoute({ superadminOnly = false }: { superadminOnly?: boolean }) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <div className="p-8 text-[var(--admin-text)]">Loading...</div>;
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (superadminOnly && admin.role !== "superadmin") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
