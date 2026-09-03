import { useEffect, useRef, useState } from "react";
import { apiClient, ApiError } from "../../api/client";
import { inputBase } from "../wizard/formStyles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  email: string;
  otp: string;
  onOtpChange: (value: string) => void;
  verified: boolean;
  onVerified: () => void;
}

/** Standalone email-OTP box for patient auth pages (signup / forgot password).
 * Kept separate from components/wizard/OtpBox.tsx, which is wired to
 * WizardContext and belongs to the existing booking form — not touched here. */
export function InlineOtp({ email, otp, onOtpChange, verified, onVerified }: Props) {
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState<{ text: string; type: "danger" | "success" | "warning" } | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!EMAIL_RE.test(email.trim()) || cooldown > 0) return;
    setSending(true);
    try {
      const data = await apiClient.post<{ status: string; dev_otp?: string }>("/otp/send", {
        email: email.trim(),
      });
      setVisible(true);
      if (data.dev_otp) {
        onOtpChange(data.dev_otp);
        setMsg({ text: `Email failed. OTP auto-filled: ${data.dev_otp}`, type: "warning" });
      } else {
        onOtpChange("");
        otpInputRef.current?.focus();
        setMsg({ text: `OTP sent to ${email}. Check inbox & spam.`, type: "success" });
      }
      setCooldown(60);
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "Network error. Please try again.", type: "danger" });
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setMsg({ text: "Enter a valid 6-digit OTP.", type: "danger" });
      return;
    }
    setVerifying(true);
    try {
      await apiClient.post("/otp/verify", { email: email.trim(), otp });
      setVisible(false);
      onVerified();
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "Network error. Please try again.", type: "danger" });
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--success)] font-bold text-[0.85rem] bg-[var(--success-bg)] px-3.5 py-1 rounded-full">
        Email Verified
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={!EMAIL_RE.test(email.trim()) || sending || cooldown > 0}
        onClick={sendOtp}
        className="shrink-0 border-2 border-[var(--primary)] text-[var(--primary)] font-semibold rounded-[var(--radius-sm)] px-4 py-2 text-sm disabled:opacity-55 disabled:cursor-not-allowed hover:bg-[var(--primary)] hover:text-white transition-all"
      >
        {sending ? "Sending…" : cooldown > 0 ? `Resend (${cooldown}s)` : "Send OTP"}
      </button>

      {visible && (
        <div className="mt-3 bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(6,182,212,0.04)] rounded-[var(--radius-md)] p-4 border-[1.5px] border-dashed border-[var(--primary-light)]">
          <div className="flex gap-2">
            <input
              ref={otpInputRef}
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ""))}
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
          {msg && (
            <div
              className={`mt-2 text-sm font-medium ${
                msg.type === "success" ? "text-[var(--success)]" : msg.type === "warning" ? "text-[var(--warning)]" : "text-[var(--danger)]"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
