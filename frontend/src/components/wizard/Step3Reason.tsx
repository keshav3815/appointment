import { useState } from "react";
import { useWizard } from "../../context/WizardContext";
import { DURATIONS, REASONS } from "../../types/wizard";
import { inputClass, labelClass, sectionHeaderClass } from "./formStyles";

export function Step3Reason({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { state, setField } = useWizard();
  const { form } = state;
  const [invalid, setInvalid] = useState(false);

  const handleNext = () => {
    if (!form.reason) {
      setInvalid(true);
      return;
    }
    onNext();
  };

  return (
    <div>
      <div className={sectionHeaderClass}>Reason for Visit</div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={labelClass}>
            Reason <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            value={form.reason}
            onChange={(e) => {
              setField("reason", e.target.value);
              setInvalid(false);
            }}
            className={inputClass(invalid)}
          >
            <option value="">Select Reason</option>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Symptoms <small className="text-[var(--muted)] font-normal">(Optional)</small>
          </label>
          <textarea
            rows={3}
            placeholder="Describe your symptoms in brief…"
            value={form.symptoms}
            onChange={(e) => setField("symptoms", e.target.value)}
            className={inputClass(false) + " resize-y min-h-[80px]"}
          />
        </div>

        <div className="md:w-1/2">
          <label className={labelClass}>
            Duration <small className="text-[var(--muted)] font-normal">(Optional)</small>
          </label>
          <select
            value={form.duration}
            onChange={(e) => setField("duration", e.target.value)}
            className={inputClass(false)}
          >
            <option value="">Select Duration</option>
            {DURATIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
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
          Next: Payment →
        </button>
      </div>
    </div>
  );
}
