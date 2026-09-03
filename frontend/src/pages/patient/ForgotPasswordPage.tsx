import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { Alert } from "../../components/patient/Alert";
import { inputClass, labelClass } from "../../components/wizard/formStyles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiClient.post<{ status: string; dev_otp?: string }>("/otp/send", {
        email: email.trim(),
      });
      setStep("reset");
      setInfo(data.dev_otp ? `Testing mode — OTP auto-filled: ${data.dev_otp}` : `OTP sent to ${email}.`);
      if (data.dev_otp) setOtp(data.dev_otp);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP sent to your email.");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      await apiClient.post("/patient/forgot-password/reset", {
        email: email.trim(),
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      navigate(`/login?email=${encodeURIComponent(email)}`, { replace: true });
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
            Reset Password
          </h1>
          <p className="text-center text-[var(--muted)] text-[0.9rem] mb-6">
            {step === "request"
              ? "Enter your account email and we'll send you a verification code."
              : "Enter the code we sent, then choose a new password."}
          </p>

          <Alert message={error} />
          <Alert message={info} type="success" />

          {step === "request" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass(false)}
                  placeholder="you@example.com"
                />
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
                {submitting ? "Sending…" : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className={labelClass}>Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className={inputClass(false)}
                  placeholder="6-digit code"
                />
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass(false)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass(false)}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full text-white font-semibold rounded-[var(--radius-md)] px-8 py-3 disabled:opacity-55"
                style={{
                  background: "linear-gradient(135deg, var(--success) 0%, #34d399 100%)",
                }}
              >
                {submitting ? "Updating…" : "Update Password"}
              </button>
              <button
                type="button"
                onClick={() => setStep("request")}
                className="w-full text-[var(--muted)] font-medium text-sm hover:text-[var(--primary)]"
              >
                ← Use a different email
              </button>
            </form>
          )}

          <p className="text-center text-[0.88rem] text-[var(--muted)] mt-5">
            <Link to="/login" className="font-semibold text-[var(--primary)] hover:underline">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
