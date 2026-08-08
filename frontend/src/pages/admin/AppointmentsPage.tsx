import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../api/client";
import { PaymentBadge, StatusBadge } from "../../components/admin/badges";

interface AppointmentRow {
  appointment_id: number;
  full_name: string;
  email: string;
  mobile: string;
  gender: string;
  age: number;
  department: string;
  doctor: string | null;
  appointment_date: string;
  time_slot: string;
  appointment_type: string;
  status: string;
  payment_status: string;
  society: string | null;
  city: string | null;
  state: string | null;
  reason: string;
  created_at: string;
}

const STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed"];
const PAYMENT_STATUSES = ["Unpaid", "Paid", "Failed", "Refunded"];

export function AppointmentsPage() {
  const [items, setItems] = useState<AppointmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [flashId, setFlashId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AppointmentRow | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (payment) params.set("payment", payment);
    params.set("page", String(page));

    apiClient
      .get<{ items: AppointmentRow[]; total: number; total_pages: number }>(
        `/admin/appointments?${params.toString()}`
      )
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      });
  };

  useEffect(load, [page, status, payment]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handlePatch = async (id: number, field: "status" | "payment_status", value: string) => {
    try {
      await apiClient.patch(`/admin/appointments/${id}`, { field, value });
      setItems((prev) => prev.map((a) => (a.appointment_id === id ? { ...a, [field]: value } : a)));
      setFlashId(id);
      setTimeout(() => setFlashId(null), 800);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Update failed");
      load();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this appointment? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/admin/appointments/${id}`);
      setItems((prev) => prev.filter((a) => a.appointment_id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  const viewDetail = async (id: number) => {
    const data = await apiClient.get<{ success: boolean; appointment: AppointmentRow }>(
      `/admin/appointments/${id}`
    );
    setDetail(data.appointment);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[var(--admin-text-muted)] mb-1">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Name, email, mobile, ID"
            className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-sm"
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
        <div>
          <label className="block text-xs text-[var(--admin-text-muted)] mb-1">Payment</label>
          <select
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white"
          style={{ background: "var(--admin-primary)" }}
        >
          Search
        </button>
      </div>

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--admin-border)] font-semibold">
          Appointments ({total})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--admin-text-muted)]">
                <th className="px-4 py-2">#ID</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Slot</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-[var(--admin-text-muted)]">
                    No appointments found.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr
                    key={a.appointment_id}
                    className="border-t border-[var(--admin-border)] transition-colors"
                    style={{ background: flashId === a.appointment_id ? "rgba(16,185,129,0.15)" : "transparent" }}
                  >
                    <td className="px-4 py-2.5 font-semibold">#{a.appointment_id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{a.full_name}</div>
                      <div className="text-xs text-[var(--admin-text-muted)]">
                        {a.gender}, {a.age}y
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <div>{a.email}</div>
                      <div className="text-[var(--admin-text-muted)]">{a.mobile}</div>
                    </td>
                    <td className="px-4 py-2.5">{a.department}</td>
                    <td className="px-4 py-2.5">{a.appointment_date}</td>
                    <td className="px-4 py-2.5">{a.time_slot}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={a.status}
                        onChange={(e) => handlePatch(a.appointment_id, "status", e.target.value)}
                        className="bg-white/5 border border-[var(--admin-border)] rounded px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={a.payment_status}
                        onChange={(e) => handlePatch(a.appointment_id, "payment_status", e.target.value)}
                        className="bg-white/5 border border-[var(--admin-border)] rounded px-2 py-1 text-xs"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 space-x-2">
                      <button
                        onClick={() => viewDetail(a.appointment_id)}
                        className="text-[var(--admin-info)] hover:underline text-xs"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(a.appointment_id)}
                        className="text-[var(--admin-danger)] hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
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

      {detail && (
        <div
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-[var(--admin-dark-2)] border border-[var(--admin-border)] rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Appointment Details</h2>
              <button onClick={() => setDetail(null)} className="text-[var(--admin-text-muted)]">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Patient Name</div>
                <div>{detail.full_name}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Email</div>
                <div>{detail.email}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Mobile</div>
                <div>{detail.mobile}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Gender / Age</div>
                <div>
                  {detail.gender} / {detail.age} yrs
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[var(--admin-text-muted)] text-xs">Address</div>
                <div>
                  {detail.society || "—"}, {detail.city || "—"}, {detail.state || "—"}
                </div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Department</div>
                <div>{detail.department}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Appointment Date</div>
                <div>{detail.appointment_date}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Time Slot</div>
                <div>{detail.time_slot}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs">Reason</div>
                <div>{detail.reason}</div>
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">Status</div>
                <StatusBadge status={detail.status} />
              </div>
              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">Payment</div>
                <PaymentBadge status={detail.payment_status} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--admin-border)] flex justify-between text-xs text-[var(--admin-text-muted)]">
              <span>Created: {detail.created_at}</span>
              <span>Apt ID: #{detail.appointment_id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
