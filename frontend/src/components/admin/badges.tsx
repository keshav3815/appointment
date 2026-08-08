const STATUS_COLORS: Record<string, string> = {
  Pending: "var(--admin-warning)",
  Confirmed: "var(--admin-success)",
  Cancelled: "var(--admin-danger)",
  Completed: "var(--admin-info)",
};

const PAYMENT_COLORS: Record<string, string> = {
  Paid: "var(--admin-success)",
  Unpaid: "var(--admin-warning)",
  Failed: "var(--admin-danger)",
  Refunded: "var(--admin-info)",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  Created: "var(--admin-text-muted)",
  Authorized: "var(--admin-info)",
  Captured: "var(--admin-success)",
  Failed: "var(--admin-danger)",
  Refunded: "var(--admin-warning)",
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
    >
      {text}
    </span>
  );
}

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge text={status} color={STATUS_COLORS[status] ?? "var(--admin-text-muted)"} />
);

export const PaymentBadge = ({ status }: { status: string }) => (
  <Badge text={status} color={PAYMENT_COLORS[status] ?? "var(--admin-text-muted)"} />
);

export const PaymentStatusBadge = ({ status }: { status: string }) => (
  <Badge text={status} color={PAYMENT_STATUS_COLORS[status] ?? "var(--admin-text-muted)"} />
);
