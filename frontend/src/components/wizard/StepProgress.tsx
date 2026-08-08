const STEPS = [
  { step: 1, label: "Patient & Address" },
  { step: 2, label: "Appointment" },
  { step: 3, label: "Reason" },
  { step: 4, label: "Payment" },
];

export function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex justify-center items-start mb-8 max-w-xl mx-auto">
      {STEPS.map(({ step, label }, idx) => {
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-[46px] h-[46px] rounded-full flex items-center justify-center font-bold text-[15px] border-[2.5px] transition-all"
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
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              >
                {step}
              </div>
              <div
                className="text-[11.5px] font-semibold mt-2 text-center max-w-[90px] leading-tight"
                style={{ color: isActive ? "var(--primary)" : isCompleted ? "var(--success)" : "#94a3b8" }}
              >
                {label}
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 h-[3px] rounded mx-[-2px] mt-[22px] min-w-[40px]"
                style={{ background: step < currentStep ? "var(--success)" : "#e2e8f0" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
