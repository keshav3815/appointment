// Internal wizard step numbers stay 3/4 (Step 1 — Patient & Address — and
// Step 2 — Appointment Details — are both unreachable now: the patient's
// account covers the first, an auto-selected next-open slot covers the
// second), but the progress indicator relabels them 1/2 so neither old step
// nor the old numbering ever shows.
const STEPS = [
  { step: 3, label: "Reason" },
  { step: 4, label: "Payment" },
];

export function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-start justify-center gap-2 sm:gap-3 mb-8">
      {STEPS.map(({ step, label }, idx) => {
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} className="flex items-start">
            <div className="flex flex-col items-center w-[90px]">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] border-[2.5px] transition-all shrink-0"
                style={{
                  borderColor: isActive ? "var(--primary)" : isCompleted ? "var(--success)" : "#cbd5e1",
                  background: isActive
                    ? "linear-gradient(135deg, var(--primary), var(--primary-light))"
                    : isCompleted
                      ? "var(--success)"
                      : "#fff",
                  color: isActive || isCompleted ? "#fff" : "#94a3b8",
                  boxShadow: isActive
                    ? "0 0 0 6px rgba(79,70,229,0.12), var(--shadow-btn)"
                    : isCompleted
                      ? "0 0 0 4px rgba(16,185,129,0.12)"
                      : "none",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                }}
              >
                {idx + 1}
              </div>
              <div
                className="text-[12px] font-semibold mt-2 text-center leading-tight"
                style={{ color: isActive ? "var(--primary)" : isCompleted ? "var(--success)" : "#94a3b8" }}
              >
                {label}
              </div>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className="w-12 sm:w-20 h-[3px] rounded mt-[21px]"
                style={{ background: step < currentStep ? "var(--success)" : "#e2e8f0" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
