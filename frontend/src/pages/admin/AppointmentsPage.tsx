import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import {
  PaymentBadge,
  StatusBadge,
} from "../../components/admin/badges";

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

const STATUSES = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Completed",
];

const PAYMENT_STATUSES = [
  "Unpaid",
  "Paid",
  "Failed",
  "Refunded",
];

export function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get("status") || "";

  const [items, setItems] = useState<AppointmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [payment, setPayment] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [flashId, setFlashId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AppointmentRow | null>(null);

  /*
   * Load appointments
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (payment) {
        params.set("payment", payment);
      }

      params.set("page", String(page));

      const data = await apiClient.get<{
        items: AppointmentRow[];
        total: number;
        total_pages: number;
      }>(`/admin/appointments?${params.toString()}`);

      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load appointments.";

      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, payment]);

  /*
   * Load whenever page/filter changes
   */
  useEffect(() => {
    load();
  }, [load]);

  /*
   * Read status from Dashboard URL
   *
   * Example:
   * /admin/appointments?status=Pending
   */
  useEffect(() => {
    const urlStatus = searchParams.get("status") || "";

    if (urlStatus !== status) {
      setStatus(urlStatus);
      setPage(1);
    }
  }, [searchParams]);

  /*
   * Search
   */
  const handleSearch = () => {
    setPage(1);
    load();
  };

  /*
   * Status filter
   */
  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);

    if (value) {
      setSearchParams({
        status: value,
      });
    } else {
      setSearchParams({});
    }
  };

  /*
   * Payment filter
   */
  const handlePaymentChange = (value: string) => {
    setPayment(value);
    setPage(1);
  };

  /*
   * Clear all filters
   */
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPayment("");
    setPage(1);
    setSearchParams({});
  };

  /*
   * Update appointment status/payment
   */
  const handlePatch = async (
    id: number,
    field: "status" | "payment_status",
    value: string
  ) => {
    try {
      await apiClient.patch(`/admin/appointments/${id}`, {
        field,
        value,
      });

      setItems((prev) =>
        prev.map((appointment) =>
          appointment.appointment_id === id
            ? {
                ...appointment,
                [field]: value,
              }
            : appointment
        )
      );

      setFlashId(id);

      setTimeout(() => {
        setFlashId(null);
      }, 800);
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "Failed to update appointment."
      );

      load();
    }
  };

  /*
   * Delete appointment
   */
  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this appointment?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/admin/appointments/${id}`);

      setItems((prev) =>
        prev.filter(
          (appointment) => appointment.appointment_id !== id
        )
      );

      setTotal((prev) => Math.max(0, prev - 1));

      /*
       * If current page becomes empty,
       * go to previous page.
       */
      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "Failed to delete appointment."
      );
    }
  };

  /*
   * View appointment details
   */
  const viewDetail = async (id: number) => {
    try {
      const data = await apiClient.get<{
        success: boolean;
        appointment: AppointmentRow;
      }>(`/admin/appointments/${id}`);

      setDetail(data.appointment);
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "Failed to load appointment details."
      );
    }
  };

  /*
   * Format date
   */
  const formatDate = (date: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">

      {/* =========================
          FILTER SECTION
      ========================== */}
      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-4">

        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-[var(--admin-text-muted)] mb-1">
              Search
            </label>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Name, email, mobile, ID"
              className="w-full bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--admin-primary)]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-[var(--admin-text-muted)] mb-1">
              Status
            </label>

            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="">All</option>

              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-xs text-[var(--admin-text-muted)] mb-1">
              Payment
            </label>

            <select
              value={payment}
              onChange={(e) =>
                handlePaymentChange(e.target.value)
              }
              className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="">All</option>

              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="text-sm font-semibold px-5 py-2 rounded-lg text-white hover:opacity-90 transition"
            style={{
              background: "var(--admin-primary)",
            }}
          >
            Search
          </button>

          {/* Clear Button */}
          <button
            onClick={clearFilters}
            className="text-sm font-semibold px-5 py-2 rounded-lg border border-[var(--admin-border)] hover:bg-white/5 transition"
          >
            Clear
          </button>

          {/* Refresh */}
          <button
            onClick={load}
            disabled={loading}
            className="text-sm font-semibold px-5 py-2 rounded-lg border border-[var(--admin-border)] hover:bg-white/5 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Active filter */}
        {(status || payment || search) && (
          <div className="mt-3 text-xs text-[var(--admin-text-muted)]">
            Active filters:

            {search && (
              <span className="ml-2">
                Search: <b>{search}</b>
              </span>
            )}

            {status && (
              <span className="ml-2">
                Status: <b>{status}</b>
              </span>
            )}

            {payment && (
              <span className="ml-2">
                Payment: <b>{payment}</b>
              </span>
            )}
          </div>
        )}
      </div>

      {/* =========================
          ERROR
      ========================== */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* =========================
          TABLE
      ========================== */}
      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">

        <div className="px-5 py-3 border-b border-[var(--admin-border)] flex justify-between items-center">

          <div>
            <div className="font-semibold">
              Appointments
            </div>

            <div className="text-xs text-[var(--admin-text-muted)] mt-1">
              Total: {total}
            </div>
          </div>

          {status && (
            <div className="text-sm">
              Showing:
              <span className="font-semibold ml-1">
                {status}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>
              <tr className="text-left text-[var(--admin-text-muted)]">

                <th className="px-4 py-3">
                  #ID
                </th>

                <th className="px-4 py-3">
                  Patient
                </th>

                <th className="px-4 py-3">
                  Contact
                </th>

                <th className="px-4 py-3">
                  Department
                </th>

                <th className="px-4 py-3">
                  Doctor
                </th>

                <th className="px-4 py-3">
                  Date
                </th>

                <th className="px-4 py-3">
                  Slot
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3">
                  Payment
                </th>

                <th className="px-4 py-3">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-10 text-[var(--admin-text-muted)]"
                  >
                    Loading appointments...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-10 text-[var(--admin-text-muted)]"
                  >
                    No appointments found.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr
                    key={a.appointment_id}
                    className="border-t border-[var(--admin-border)] transition-colors"
                    style={{
                      background:
                        flashId === a.appointment_id
                          ? "rgba(16,185,129,0.15)"
                          : "transparent",
                    }}
                  >

                    {/* ID */}
                    <td className="px-4 py-3 font-semibold">
                      #{a.appointment_id}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3">

                      <div className="font-medium">
                        {a.full_name}
                      </div>

                      <div className="text-xs text-[var(--admin-text-muted)]">
                        {a.gender}, {a.age} years
                      </div>

                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 text-xs">

                      <div>
                        {a.email || "—"}
                      </div>

                      <div className="text-[var(--admin-text-muted)]">
                        {a.mobile || "—"}
                      </div>

                    </td>

                    {/* Department */}
                    <td className="px-4 py-3">
                      {a.department || "—"}
                    </td>

                    {/* Doctor */}
                    <td className="px-4 py-3">
                      {a.doctor || "—"}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      {formatDate(a.appointment_date)}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      {a.time_slot || "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">

                      <select
                        value={a.status}
                        onChange={(e) =>
                          handlePatch(
                            a.appointment_id,
                            "status",
                            e.target.value
                          )
                        }
                        className="bg-white/5 border border-[var(--admin-border)] rounded px-2 py-1.5 text-xs outline-none"
                      >
                        {STATUSES.map((item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ))}
                      </select>

                      <div className="mt-1">
                        <StatusBadge status={a.status} />
                      </div>

                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3">

                      <select
                        value={a.payment_status}
                        onChange={(e) =>
                          handlePatch(
                            a.appointment_id,
                            "payment_status",
                            e.target.value
                          )
                        }
                        className="bg-white/5 border border-[var(--admin-border)] rounded px-2 py-1.5 text-xs outline-none"
                      >
                        {PAYMENT_STATUSES.map((item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ))}
                      </select>

                      <div className="mt-1">
                        <PaymentBadge
                          status={a.payment_status}
                        />
                      </div>

                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">

                      <div className="flex gap-3 whitespace-nowrap">

                        <button
                          onClick={() =>
                            viewDetail(a.appointment_id)
                          }
                          className="text-[var(--admin-info)] hover:underline text-xs font-semibold"
                        >
                          View
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(a.appointment_id)
                          }
                          className="text-[var(--admin-danger)] hover:underline text-xs font-semibold"
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>
        </div>
      </div>

      {/* =========================
          PAGINATION
      ========================== */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 text-sm flex-wrap">

          {/* Previous */}
          <button
            disabled={page <= 1}
            onClick={() =>
              setPage((prev) => Math.max(1, prev - 1))
            }
            className="px-3 h-8 rounded-lg bg-white/5 border border-[var(--admin-border)] disabled:opacity-30"
          >
            Previous
          </button>

          {Array.from(
            { length: totalPages },
            (_, i) => i + 1
          ).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg ${
                p === page
                  ? "bg-[var(--admin-primary)] text-white"
                  : "bg-white/5 text-[var(--admin-text-muted)]"
              }`}
            >
              {p}
            </button>
          ))}

          {/* Next */}
          <button
            disabled={page >= totalPages}
            onClick={() =>
              setPage((prev) =>
                Math.min(totalPages, prev + 1)
              )
            }
            className="px-3 h-8 rounded-lg bg-white/5 border border-[var(--admin-border)] disabled:opacity-30"
          >
            Next
          </button>

        </div>
      )}

      {/* =========================
          DETAILS MODAL
      ========================== */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >

          <div
            className="bg-[var(--admin-dark-2)] border border-[var(--admin-border)] rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="flex justify-between items-center mb-5">

              <div>
                <h2 className="font-bold text-lg">
                  Appointment Details
                </h2>

                <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                  Appointment #{detail.appointment_id}
                </p>
              </div>

              <button
                onClick={() => setDetail(null)}
                className="text-[var(--admin-text-muted)] hover:text-white text-xl"
              >
                ✕
              </button>

            </div>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Patient Name
                </div>
                <div className="font-medium">
                  {detail.full_name}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Email
                </div>
                <div>
                  {detail.email || "—"}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Mobile
                </div>
                <div>
                  {detail.mobile || "—"}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Gender / Age
                </div>
                <div>
                  {detail.gender || "—"} /{" "}
                  {detail.age || "—"} yrs
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Department
                </div>
                <div>
                  {detail.department || "—"}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Doctor
                </div>
                <div>
                  {detail.doctor || "—"}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Appointment Date
                </div>
                <div>
                  {formatDate(detail.appointment_date)}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Time Slot
                </div>
                <div>
                  {detail.time_slot || "—"}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Appointment Type
                </div>
                <div>
                  {detail.appointment_type || "—"}
                </div>
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Status
                </div>

                <StatusBadge
                  status={detail.status}
                />
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Payment Status
                </div>

                <PaymentBadge
                  status={detail.payment_status}
                />
              </div>

              <div>
                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Address
                </div>

                <div>
                  {detail.society || "—"},{" "}
                  {detail.city || "—"},{" "}
                  {detail.state || "—"}
                </div>
              </div>

              <div className="sm:col-span-2">

                <div className="text-[var(--admin-text-muted)] text-xs mb-1">
                  Reason for Appointment
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  {detail.reason || "No reason provided."}
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-[var(--admin-border)] flex justify-between text-xs text-[var(--admin-text-muted)]">

              <span>
                Created: {detail.created_at || "—"}
              </span>

              <span>
                Apt ID: #{detail.appointment_id}
              </span>

            </div>

            {/* Close */}
            <div className="mt-5 flex justify-end">

              <button
                onClick={() => setDetail(null)}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{
                  background: "var(--admin-primary)",
                }}
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}