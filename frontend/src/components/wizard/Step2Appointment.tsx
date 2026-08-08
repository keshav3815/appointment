import { useState } from "react";
import { useWizard } from "../../context/WizardContext";
import { DEPARTMENTS, TIME_SLOTS } from "../../types/wizard";
import { inputClass, labelClass, sectionHeaderClass } from "./formStyles";

export function Step2Appointment({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { state, setField, showAlert } = useWizard();
  const { form } = state;
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split("T")[0];

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    let valid = true;

    if (!form.department) {
      next.department = true;
      valid = false;
    }
    if (!form.appointment_date) {
      next.appointment_date = true;
      valid = false;
    } else {
      const d = new Date(form.appointment_date);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (d < todayDate) {
        next.appointment_date = true;
        valid = false;
      }
    }
    if (!form.time_slot) {
      next.time_slot = true;
      valid = false;
    }
    if (!form.appointment_type) {
      showAlert("Select appointment type (New / Follow-up).", "warning");
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
      <div className={sectionHeaderClass}>Appointment Details</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Department <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            value={form.department}
            onChange={(e) => {
              setField("department", e.target.value);
              setInvalid((p) => ({ ...p, department: false }));
            }}
            className={inputClass(!!invalid.department)}
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Preferred Doctor</label>
          <select
            value={form.doctor}
            onChange={(e) => setField("doctor", e.target.value)}
            className={inputClass(false)}
          >
            <option value="">Any Available</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Appointment Date <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="date"
            min={today}
            value={form.appointment_date}
            onChange={(e) => {
              setField("appointment_date", e.target.value);
              setInvalid((p) => ({ ...p, appointment_date: false }));
            }}
            className={inputClass(!!invalid.appointment_date)}
          />
        </div>

        <div>
          <label className={labelClass}>
            Time Slot <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            value={form.time_slot}
            onChange={(e) => {
              setField("time_slot", e.target.value);
              setInvalid((p) => ({ ...p, time_slot: false }));
            }}
            className={inputClass(!!invalid.time_slot)}
          >
            <option value="">Select Slot</option>
            {TIME_SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Appointment Type <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex gap-4 mt-2">
            {[
              { value: "New", label: "New Visit" },
              { value: "Follow-up", label: "Follow-up" },
            ].map(({ value, label }) => (
              <label key={value} className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="appointment_type"
                  value={value}
                  checked={form.appointment_type === value}
                  onChange={(e) => setField("appointment_type", e.target.value)}
                  className="w-5 h-5 accent-[var(--primary)]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-7">
        <button
          type="button"
          onClick={onBack}
          className="font-semibold rounded-[var(--radius-md)] px-8 py-3 border-2 border-[#e2e8f0] text-[var(--muted)] bg-white hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-bg)]"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="text-white font-semibold rounded-[var(--radius-md)] px-8 py-3 min-w-[140px]"
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
            boxShadow: "var(--shadow-btn)",
          }}
        >
          Next: Reason →
        </button>
      </div>
    </div>
  );
}
