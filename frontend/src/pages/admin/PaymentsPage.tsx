import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { PaymentStatusBadge } from "../../components/admin/badges";
import { StatCard } from "../../components/admin/StatCard";

interface PaymentRow {
  payment_id: number;
  appointment_id: number;
  full_name: string;
  amount: string;
  razorpay_order_id: string | null;
  transaction_id: string | null;
  payment_gateway: string;
  payment_status: string;
  created_at: string;
}

const STATUSES = ["Created", "Authorized", "Captured", "Failed", "Refunded"];

export function PaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState({ total_captured: 0, pending_orders: 0, failed_count: 0 });

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", String(page));

    apiClient
      .get<{
        items: PaymentRow[];
        total: number;
        total_pages: number;
        summary: typeof summary;
      }>(`/admin/payments?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setSummary(data.summary);
      });
  };

  useEffect(load, [page, status]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Captured" value={`₹${summary.total_captured.toLocaleString()}`} accent="var(--admin-success)" />
        <StatCard label="Pending Orders" value={String(summary.pending_orders)} accent="var(--admin-warning)" />
        <StatCard label="Failed" value={String(summary.failed_count)} accent="var(--admin-danger)" />
      </div>

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[var(--admin-text-muted)] mb-1">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
            placeholder="Patient, transaction ID, order ID"
            className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-sm w-64"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--admin-text-muted)] mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white"
          style={{ background: "var(--admin-primary)" }}
        >
          Search
        </button>
      </div>

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--admin-border)] font-semibold">Payments ({total})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--admin-text-muted)]">
                <th className="px-4 py-2">Payment#</th>
                <th className="px-4 py-2">Apt#</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Order ID</th>
                <th className="px-4 py-2">Transaction ID</th>
                <th className="px-4 py-2">Gateway</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-[var(--admin-text-muted)]">
                    No payments found.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.payment_id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2.5 font-semibold">#{p.payment_id}</td>
                    <td className="px-4 py-2.5">#{p.appointment_id}</td>
                    <td className="px-4 py-2.5">{p.full_name}</td>
                    <td className="px-4 py-2.5 font-semibold">₹{p.amount}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <code>{p.razorpay_order_id ?? "—"}</code>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <code>{p.transaction_id ?? "—"}</code>
                    </td>
                    <td className="px-4 py-2.5">{p.payment_gateway}</td>
                    <td className="px-4 py-2.5">
                      <PaymentStatusBadge status={p.payment_status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs">{p.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg ${
                p === page ? "bg-[var(--admin-primary)] text-white" : "bg-white/5 text-[var(--admin-text-muted)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
