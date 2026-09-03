import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Alert } from "../../components/patient/Alert";
import { usePatientAuth } from "../../context/PatientAuthContext";
import { inputClass, labelClass } from "../../components/wizard/formStyles";

export function PatientLoginPage() {
  const { login } = usePatientAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full relative z-10">
        <div className="glass-card p-8">
          <h1
            className="text-center font-extrabold text-[1.5rem] mb-1 bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            Welcome Back
          </h1>
          <p className="text-center text-[var(--muted)] text-[0.9rem] mb-6">
            Log in to book and manage your appointments
          </p>

          <Alert message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass(false)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass(false)}
                placeholder="••••••••"
              />
              <div className="text-right mt-1.5">
                <Link
                  to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                  className="text-[0.82rem] font-semibold text-[var(--primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-semibold rounded-[var(--radius-md)] px-8 py-3 disabled:opacity-55"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              {submitting ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="text-center text-[0.88rem] text-[var(--muted)] mt-5">
            New here?{" "}
            <Link
              to={`/signup${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
