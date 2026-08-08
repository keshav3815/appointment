import { useEffect, useRef, useState } from "react";
import { apiClient, ApiError } from "../../api/client";
import { useWizard } from "../../context/WizardContext";
import { inputBase } from "./formStyles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  email: string;
  onVerified: () => void;
  verified: boolean;
}

export function OtpBox({ email, onVerified, verified }: Props) {
  const { showAlert } = useWizard();
  const [visible, setVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpMsg, setOtpMsg] = useState<{ text: string; type: "danger" | "success" | "warning" } | null>(
    null
  );
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!EMAIL_RE.test(email.trim())) return;
    if (cooldown > 0) {
      showAlert("Please wait before requesting another OTP.", "warning");
      return;
    }

    setSending(true);
    try {
      const data = await apiClient.post<{ status: string; message: string; dev_otp?: string }>(
        "/otp/send",
        { email: email.trim() }
      );

      if (data.status === "success") {
        setVisible(true);
        if (data.dev_otp) {
          setOtp(data.dev_otp);
          setOtpMsg({
            text: `Email failed. OTP auto-filled: ${data.dev_otp}`,
            type: "warning",
          });
        } else {
          setOtp("");
          otpInputRef.current?.focus();
          setOtpMsg({ text: `OTP sent to ${email}. Check inbox & spam.`, type: "success" });
        }
        setCooldown(60);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Network error. Please try again.";
      showAlert(message, "danger", 8000);
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpMsg({ text: "Enter a valid 6-digit OTP.", type: "danger" });
      return;
    }

    setVerifying(true);
    try {
      const data = await apiClient.post<{ status: string; message: string }>("/otp/verify", {
        email: email.trim(),
        otp,
      });

      if (data.status === "success") {
        setVisible(false);
        onVerified();
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Network error. Please try again.";
      setOtpMsg({ text: message, type: "danger" });
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="mt-2">
        <span className="inline-flex items-center gap-1.5 text-[var(--success)] font-bold text-[0.88rem] bg-[var(--success-bg)] px-3.5 py-1 rounded-full">
          Email Verified
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={!EMAIL_RE.test(email.trim()) || sending || cooldown > 0}
        onClick={sendOtp}
        className="shrink-0 border-2 border-[var(--primary)] text-[var(--primary)] font-semibold rounded-r-[var(--radius-sm)] px-4 disabled:opacity-55 disabled:cursor-not-allowed hover:bg-[var(--primary)] hover:text-white transition-all"
      >
        {sending ? "Sending…" : cooldown > 0 ? `Resend (${cooldown}s)` : "Send OTP"}
      </button>

      {visible && (
        <div className="mt-4 bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(6,182,212,0.04)] rounded-[var(--radius-md)] p-5 border-[1.5px] border-dashed border-[var(--primary-light)]">
          <label className="block font-bold text-[var(--primary)] mb-1.5">Email OTP Verification</label>
          <div className="flex gap-2">
            <input
              ref={otpInputRef}
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit OTP"
              className={inputBase + " border-[#e2e8f0] focus:border-[var(--primary)]"}
            />
            <button
              type="button"
              disabled={verifying}
              onClick={verifyOtp}
              className="shrink-0 font-semibold text-white rounded-[var(--radius-sm)] px-4 disabled:opacity-55"
              style={{ background: "linear-gradient(135deg, var(--success) 0%, #34d399 100%)" }}
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
          </div>
          <small className="block text-[var(--muted)] mt-1">OTP is valid for 5 minutes</small>
          {otpMsg && (
            <div
              className={`mt-2 text-sm font-medium ${
                otpMsg.type === "success"
                  ? "text-[var(--success)]"
                  : otpMsg.type === "warning"
                    ? "text-[var(--warning)]"
                    : "text-[var(--danger)]"
              }`}
            >
              {otpMsg.text}
            </div>
          )}
        </div>
      )}
    </>
  );
}
