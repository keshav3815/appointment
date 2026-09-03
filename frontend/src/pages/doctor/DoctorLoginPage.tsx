import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useDoctorAuth } from "../../context/DoctorAuthContext";

export function DoctorLoginPage() {
  const { login } = useDoctorAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/doctor", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-bg flex items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-glass)] backdrop-blur-md p-8">
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-[1.1rem] mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, var(--admin-primary), var(--admin-accent))" }}
          >
            Dr
          </div>
          <h1 className="font-bold text-[1.3rem] text-white">Doctor Portal</h1>
          <p className="text-[var(--admin-text-muted)] text-[0.85rem]">Log in to manage your appointments</p>
        </div>

        {error && (
          <div className="rounded-lg bg-[rgba(239,68,68,0.12)] text-[#fca5a5] text-sm font-medium px-4 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.82rem] font-semibold text-[var(--admin-text-muted)] mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-black/20 px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--admin-primary)]"
            />
          </div>
          <div>
            <label className="block text-[0.82rem] font-semibold text-[var(--admin-text-muted)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-black/20 px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--admin-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full text-white font-semibold rounded-lg px-6 py-2.5 disabled:opacity-55"
            style={{ background: "linear-gradient(135deg, var(--admin-primary) 0%, var(--admin-primary-dark) 100%)" }}
          >
            {submitting ? "Logging in…" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
