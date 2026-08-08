import { useState } from "react";
import { useWizard } from "../../context/WizardContext";
import { STATES } from "../../types/wizard";
import { OtpBox } from "./OtpBox";
import { inputClass, labelClass, sectionHeaderClass } from "./formStyles";

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculateAge(dob: string): string {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? `${age} years` : "";
}

export function Step1PatientAddress({ onNext }: { onNext: () => void }) {
  const { state, setField, showAlert, dispatch } = useWizard();
  const { form, otpVerified } = state;
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split("T")[0];

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    let valid = true;

    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      next.full_name = true;
      valid = false;
    }
    if (!MOBILE_RE.test(form.mobile.trim())) {
      next.mobile = true;
      valid = false;
    }
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) {
      next.email = true;
      valid = false;
    }
    if (!form.gender) {
      showAlert("Please select a gender.", "warning");
      valid = false;
    }
    if (!form.dob) {
      next.dob = true;
      valid = false;
    } else if (new Date(form.dob) > new Date()) {
      next.dob = true;
      valid = false;
    }
    if (!otpVerified) {
      showAlert("Please verify your email with OTP before proceeding.", "warning");
      valid = false;
    }
    if (!form.city.trim()) {
      next.city = true;
      valid = false;
    }
    if (!form.state) {
      next.state = true;
      valid = false;
    }

    setInvalid(next);
    return valid;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div>
      <div className={sectionHeaderClass}>Patient Information</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Full Name <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Rajesh Kumar"
            value={form.full_name}
            onChange={(e) => {
              setField("full_name", e.target.value);
              setInvalid((p) => ({ ...p, full_name: false }));
            }}
            className={inputClass(!!invalid.full_name)}
          />
        </div>

        <div>
          <label className={labelClass}>
            Mobile Number <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="tel"
            maxLength={10}
            placeholder="10-digit number"
            value={form.mobile}
            onChange={(e) => {
              setField("mobile", e.target.value.replace(/\D/g, ""));
              setInvalid((p) => ({ ...p, mobile: false }));
            }}
            className={inputClass(!!invalid.mobile)}
          />
        </div>

        <div>
          <label className={labelClass}>
            Email ID <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex">
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              readOnly={otpVerified}
              onChange={(e) => {
                setField("email", e.target.value);
                setInvalid((p) => ({ ...p, email: false }));
              }}
              className={inputClass(!!invalid.email) + " rounded-r-none"}
            />
            <OtpBox
              email={form.email}
              verified={otpVerified}
              onVerified={() => dispatch({ type: "SET_OTP_VERIFIED", value: true })}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Gender <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex gap-4 mt-2">
            {["Male", "Female"].map((g) => (
              <label key={g} className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={form.gender === g}
                  onChange={(e) => setField("gender", e.target.value)}
                  className="w-5 h-5 accent-[var(--primary)]"
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Date of Birth <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="date"
            max={today}
            value={form.dob}
            onChange={(e) => {
              setField("dob", e.target.value);
              setInvalid((p) => ({ ...p, dob: false }));
            }}
            className={inputClass(!!invalid.dob)}
          />
        </div>

        <div>
          <label className={labelClass}>Age</label>
          <input
            type="text"
            readOnly
            placeholder="Auto-calculated"
            value={calculateAge(form.dob)}
            className={inputClass(false) + " bg-[#f1f5f9] text-[var(--muted)] cursor-default"}
          />
        </div>
      </div>

      <div className="h-px my-6" style={{ background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)" }} />

      <div className={sectionHeaderClass}>Address Details</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Society / Sector Name</label>
          <input
            type="text"
            placeholder="Optional"
            value={form.society}
            onChange={(e) => setField("society", e.target.value)}
            className={inputClass(false)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              City <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="City"
              value={form.city}
              onChange={(e) => {
                setField("city", e.target.value);
                setInvalid((p) => ({ ...p, city: false }));
              }}
              className={inputClass(!!invalid.city)}
            />
          </div>
          <div>
            <label className={labelClass}>
              State <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={form.state}
              onChange={(e) => {
                setField("state", e.target.value);
                setInvalid((p) => ({ ...p, state: false }));
              }}
              className={inputClass(!!invalid.state)}
            >
              <option value="">Select</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-7">
        <div />
        <button
          type="button"
          onClick={handleNext}
          className="text-white font-semibold rounded-[var(--radius-md)] px-8 py-3 min-w-[140px]"
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
            boxShadow: "var(--shadow-btn)",
          }}
        >
          Next: Appointment →
        </button>
      </div>
    </div>
  );
}
