import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { Alert } from "../../components/patient/Alert";
import { InlineOtp } from "../../components/patient/InlineOtp";
import { usePatientAuth, type PatientInfo } from "../../context/PatientAuthContext";
import { inputClass, labelClass } from "../../components/wizard/formStyles";

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupPage() {
  const { setPatient } = usePatientAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/";

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!MOBILE_RE.test(mobile)) return setError("Please enter a valid 10-digit mobile number.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (!gender) return setError("Please select a gender.");
    if (!dob) return setError("Please enter your date of birth.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!otpVerified) return setError("Please verify your email with OTP first.");

    setSubmitting(true);
    try {
      const data = await apiClient.post<{ status: string; patient: PatientInfo }>("/patient/signup", {
        full_name: fullName.trim(),
        mobile,
        email: email.trim(),
        password,
        gender,
        dob,
      });
      setPatient(data.patient);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full relative z-10">
        <div className="glass-card p-8">
          <h1
            className="text-center font-extrabold text-[1.5rem] mb-1 bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            Create Your Account
          </h1>
          <p className="text-center text-[var(--muted)] text-[0.9rem] mb-6">
            Book appointments and keep your medical history in one place
          </p>

          <Alert message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass(false)}
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>
              <div>
                <label className={labelClass}>Mobile Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  className={inputClass(false)}
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                readOnly={otpVerified}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass(false)}
                placeholder="you@example.com"
              />
              <div className="mt-2">
                <InlineOtp
                  email={email}
                  otp={otp}
                  onOtpChange={setOtp}
                  verified={otpVerified}
                  onVerified={() => setOtpVerified(true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gender</label>
                <div className="flex gap-4 mt-2">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-sm">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={gender === g}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  max={today}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass(false)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass(false)}
                />
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
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-[0.88rem] text-[var(--muted)] mt-5">
            Already have an account?{" "}
            <Link
              to={`/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
