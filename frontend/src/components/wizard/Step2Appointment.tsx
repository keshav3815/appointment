import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useWizard } from "../../context/WizardContext";
import { DEPARTMENTS, TIME_SLOTS } from "../../types/wizard";
import { inputClass, labelClass, sectionHeaderClass } from "./formStyles";

interface SlotInfo {
  time_slot: string;
  available: boolean;
}

export function Step2Appointment({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { state, setField, showAlert } = useWizard();
  const { form, selectedDoctor } = state;
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [doctorSlots, setDoctorSlots] = useState<SlotInfo[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // When a specific doctor is locked in, pull their real availability for the
  // chosen date instead of offering the same static slot list to everyone.
  useEffect(() => {
    if (!selectedDoctor || !form.appointment_date) {
      setDoctorSlots(null);
      return;
    }
    setSlotsLoading(true);
    apiClient
      .get<{ status: string; slots: SlotInfo[]; is_available_day: boolean }>(
        `/doctors/${selectedDoctor.doctor_id}/slots?date=${form.appointment_date}`
      )
      .then((res) => {
        setDoctorSlots(res.slots);
        if (!res.is_available_day) {
          showAlert("The doctor is not available on this day. Please pick another date.", "warning");
        }
      })
      .catch(() => setDoctorSlots(null))
      .finally(() => setSlotsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor, form.appointment_date]);

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

      {selectedDoctor && (
        <div
          className="rounded-[var(--radius-md)] p-4 mb-5 border-[1.5px] border-[rgba(79,70,229,0.15)] flex items-center justify-between gap-3"
          style={{ background: "linear-gradient(135deg, var(--primary-bg), #f0f9ff)" }}
        >
          <div>
            <div className="text-[0.72rem] font-bold text-[var(--muted)] uppercase tracking-wide">
              Booking With
            </div>
            <div className="font-bold text-[var(--dark)]">{selectedDoctor.full_name}</div>
          </div>
          <span className="text-[0.75rem] font-semibold px-3 py-1 rounded-full bg-white text-[var(--primary)] capitalize">
            {form.consultation_mode === "video" ? "Video Consultation" : "Clinic Visit"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Department <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            value={form.department}
            disabled={!!selectedDoctor}
            onChange={(e) => {
              setField("department", e.target.value);
              setInvalid((p) => ({ ...p, department: false }));
            }}
            className={inputClass(!!invalid.department) + (selectedDoctor ? " opacity-70 cursor-not-allowed" : "")}
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {!selectedDoctor && (
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
        )}

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
              setField("time_slot", "");
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
            disabled={slotsLoading}
            className={inputClass(!!invalid.time_slot)}
          >
            <option value="">{slotsLoading ? "Loading slots…" : "Select Slot"}</option>
            {(doctorSlots ?? TIME_SLOTS.map((s) => ({ time_slot: s, available: true }))).map((s) => (
              <option key={s.time_slot} value={s.time_slot} disabled={!s.available}>
                {s.time_slot}
                {!s.available ? " (booked)" : ""}
              </option>
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
