export function Topbar({ title, onToggleSidebar }: { title: string; onToggleSidebar: () => void }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-16 flex items-center justify-between px-5 border-b border-[var(--admin-border)] bg-[var(--admin-glass)] backdrop-blur-xl sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden text-[var(--admin-text)] w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <h1 className="font-bold text-lg text-[var(--admin-text)]">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-sm text-[var(--admin-text-muted)]">{today}</span>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-[var(--admin-accent)] hover:underline"
        >
          View Site
        </a>
      </div>
    </header>
  );
}
