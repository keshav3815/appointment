import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePatientAuth } from "../../context/PatientAuthContext";

/** Route guard for pages that require a logged-in patient — doctor listing,
 * doctor profile, and the booking wizard all sit behind this. Preserves the
 * exact URL (including query string) the patient was headed to, so login
 * returns them to the same search instead of losing it. */
export function RequirePatientAuth() {
  const { patient, loading } = usePatientAuth();
  const location = useLocation();

  if (loading) {
    return <div className="bg-white min-h-screen flex items-center justify-center text-[var(--muted)]">Loading…</div>;
  }

  if (!patient) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}
