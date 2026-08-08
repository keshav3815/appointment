export const inputBase =
  "w-full rounded-[var(--radius-sm)] border-[1.5px] bg-white/96 px-3.5 py-2.5 text-[0.95rem] text-[var(--dark)] transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(79,70,229,0.10)]";

export function inputClass(invalid: boolean): string {
  return `${inputBase} ${
    invalid
      ? "border-[var(--danger)] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]"
      : "border-[#e2e8f0] focus:border-[var(--primary)]"
  }`;
}

export const labelClass = "block font-semibold text-[0.875rem] text-[var(--dark)] mb-1.5";

export const sectionHeaderClass =
  "font-bold text-[var(--primary)] mt-1.5 mb-5 px-4 py-2.5 text-[1.1rem] bg-gradient-to-r from-[var(--primary-bg)] to-transparent border-l-4 border-[var(--primary)] rounded-r-[var(--radius-sm)]";

export const errorTextClass = "text-[0.8rem] font-medium text-[var(--danger)] mt-1";
