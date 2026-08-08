export function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-5">
      <div className="text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-sm text-[var(--admin-text-muted)] mt-1">{label}</div>
    </div>
  );
}
