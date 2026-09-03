import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { StatCard } from "../../components/admin/StatCard";
import {
  PaymentBadge,
  PaymentStatusBadge,
  StatusBadge,
} from "../../components/admin/badges";

interface DashboardData {
  total_appointments: number;
  today_appointments: number;
  total_patients: number;
  total_revenue: number;
  pending_count: number;
  confirmed_count: number;
  cancelled_count: number;

  recent_appointments: {
    appointment_id: number;
    department: string;
    appointment_date: string;
    time_slot: string;
    status: string;
    payment_status: string;
    full_name: string;
  }[];

  recent_payments: {
    payment_id: number;
    appointment_id: number;
    amount: string;
    transaction_id: string | null;
    payment_status: string;
    full_name: string;
  }[];

  department_breakdown: {
    department: string;
    count: number;
  }[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setError("");

      const result = await apiClient.get<DashboardData>("/admin/dashboard");

      setData(result);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Dashboard data load nahi ho pa raha.");
    }
  }

  if (error) {
    return (
      <div className="bg-[var(--admin-glass)] border border-[var(--admin-border)] rounded-xl p-6">
        <p className="text-red-400">{error}</p>

        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--admin-primary)] text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-[var(--admin-text-muted)]">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ================= STAT CARDS ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <Link
          to="/admin/appointments"
          className="block hover:scale-[1.01] transition"
        >
          <StatCard
            label="Total Appointments"
            value={String(data.total_appointments)}
            accent="var(--admin-primary)"
          />
        </Link>

        <Link
          to="/admin/appointments"
          className="block hover:scale-[1.01] transition"
        >
          <StatCard
            label="Today's Appointments"
            value={String(data.today_appointments)}
            accent="var(--admin-success)"
          />
        </Link>

        <Link
          to="/admin/patients"
          className="block hover:scale-[1.01] transition"
        >
          <StatCard
            label="Total Patients"
            value={String(data.total_patients)}
            accent="var(--admin-info)"
          />
        </Link>

        <Link
          to="/admin/payments"
          className="block hover:scale-[1.01] transition"
        >
          <StatCard
            label="Total Revenue"
            value={`₹${Number(data.total_revenue).toLocaleString("en-IN")}`}
            accent="var(--admin-warning)"
          />
        </Link>

      </div>

      {/* ================= STATUS + DEPARTMENT ================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Appointment Status */}

        <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-5">

          <div className="font-semibold mb-3">
            Appointment Status
          </div>

          <div className="flex gap-3 flex-wrap text-sm">

            <Link
              to="/admin/appointments?status=pending"
              className="flex items-center gap-2 hover:opacity-80"
            >
              <StatusBadge status="Pending" />
              <span>{data.pending_count}</span>
            </Link>

            <Link
              to="/admin/appointments?status=confirmed"
              className="flex items-center gap-2 hover:opacity-80"
            >
              <StatusBadge status="Confirmed" />
              <span>{data.confirmed_count}</span>
            </Link>

            <Link
              to="/admin/appointments?status=cancelled"
              className="flex items-center gap-2 hover:opacity-80"
            >
              <StatusBadge status="Cancelled" />
              <span>{data.cancelled_count}</span>
            </Link>

          </div>
        </div>

        {/* Top Departments */}

        <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-5">

          <div className="font-semibold mb-3">
            Top Departments
          </div>

          {data.department_breakdown.length === 0 ? (
            <p className="text-[var(--admin-text-muted)] text-sm">
              No data yet.
            </p>
          ) : (
            data.department_breakdown.map((d) => (
              <Link
                key={d.department}
                to={`/admin/appointments?department=${encodeURIComponent(
                  d.department
                )}`}
                className="flex justify-between py-2 text-sm hover:bg-white/5 px-2 rounded-lg transition"
              >
                <span>{d.department}</span>

                <span className="font-semibold text-[var(--admin-primary)]">
                  {d.count}
                </span>
              </Link>
            ))
          )}

        </div>
      </div>

      {/* ================= RECENT APPOINTMENTS ================= */}

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">

        <div className="flex justify-between items-center px-5 py-3 border-b border-[var(--admin-border)]">

          <span className="font-semibold">
            Recent Appointments
          </span>

          <Link
            to="/admin/appointments"
            className="text-sm text-[var(--admin-accent)] hover:underline"
          >
            View All
          </Link>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>
              <tr className="text-left text-[var(--admin-text-muted)]">
                <th className="px-5 py-2">#ID</th>
                <th className="px-5 py-2">Patient</th>
                <th className="px-5 py-2">Department</th>
                <th className="px-5 py-2">Date</th>
                <th className="px-5 py-2">Time</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Payment</th>
              </tr>
            </thead>

            <tbody>

              {data.recent_appointments.length === 0 ? (

                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-6 text-[var(--admin-text-muted)]"
                  >
                    No appointments yet.
                  </td>
                </tr>

              ) : (

                data.recent_appointments.map((a) => (

                  <tr
                    key={a.appointment_id}
                    className="border-t border-[var(--admin-border)] hover:bg-white/5 transition"
                  >

                    <td className="px-5 py-2.5 font-semibold">
                      <Link
                        to={`/admin/appointments/${a.appointment_id}`}
                        className="text-[var(--admin-primary)] hover:underline"
                      >
                        #{a.appointment_id}
                      </Link>
                    </td>

                    <td className="px-5 py-2.5">
                      {a.full_name}
                    </td>

                    <td className="px-5 py-2.5">
                      {a.department}
                    </td>

                    <td className="px-5 py-2.5">
                      {a.appointment_date}
                    </td>

                    <td className="px-5 py-2.5">
                      {a.time_slot}
                    </td>

                    <td className="px-5 py-2.5">
                      <Link
                        to={`/admin/appointments/${a.appointment_id}`}
                      >
                        <StatusBadge status={a.status} />
                      </Link>
                    </td>

                    <td className="px-5 py-2.5">
                      <Link
                        to={`/admin/payments?appointment_id=${a.appointment_id}`}
                      >
                        <PaymentBadge status={a.payment_status} />
                      </Link>
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* ================= RECENT PAYMENTS ================= */}

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">

        <div className="flex justify-between items-center px-5 py-3 border-b border-[var(--admin-border)]">

          <span className="font-semibold">
            Recent Payments
          </span>

          <Link
            to="/admin/payments"
            className="text-sm text-[var(--admin-accent)] hover:underline"
          >
            View All
          </Link>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>
              <tr className="text-left text-[var(--admin-text-muted)]">
                <th className="px-5 py-2">Apt #</th>
                <th className="px-5 py-2">Patient</th>
                <th className="px-5 py-2">Amount</th>
                <th className="px-5 py-2">Transaction ID</th>
                <th className="px-5 py-2">Status</th>
              </tr>
            </thead>

            <tbody>

              {data.recent_payments.length === 0 ? (

                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-6 text-[var(--admin-text-muted)]"
                  >
                    No payments yet.
                  </td>
                </tr>

              ) : (

                data.recent_payments.map((p) => (

                  <tr
                    key={p.payment_id}
                    className="border-t border-[var(--admin-border)] hover:bg-white/5 transition"
                  >

                    <td className="px-5 py-2.5 font-semibold">

                      <Link
                        to={`/admin/appointments/${p.appointment_id}`}
                        className="text-[var(--admin-primary)] hover:underline"
                      >
                        #{p.appointment_id}
                      </Link>

                    </td>

                    <td className="px-5 py-2.5">
                      {p.full_name}
                    </td>

                    <td className="px-5 py-2.5 font-semibold">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-2.5">

                      <Link
                        to={`/admin/payments?payment_id=${p.payment_id}`}
                      >
                        <code className="text-xs hover:underline">
                          {p.transaction_id ?? "—"}
                        </code>
                      </Link>

                    </td>

                    <td className="px-5 py-2.5">

                      <Link
                        to={`/admin/payments?status=${p.payment_status}`}
                      >
                        <PaymentStatusBadge
                          status={p.payment_status}
                        />
                      </Link>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* ================= QUICK ACTIONS ================= */}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

        <Link
          to="/admin/appointments"
          className="rounded-xl border border-[var(--admin-border)] p-4 text-center hover:bg-white/5 transition"
        >
          📅
          <div className="mt-1 text-sm font-semibold">
            Appointments
          </div>
        </Link>

        <Link
          to="/admin/patients"
          className="rounded-xl border border-[var(--admin-border)] p-4 text-center hover:bg-white/5 transition"
        >
          👤
          <div className="mt-1 text-sm font-semibold">
            Patients
          </div>
        </Link>

        <Link
          to="/admin/payments"
          className="rounded-xl border border-[var(--admin-border)] p-4 text-center hover:bg-white/5 transition"
        >
          💳
          <div className="mt-1 text-sm font-semibold">
            Payments
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="rounded-xl border border-[var(--admin-border)] p-4 text-center hover:bg-white/5 transition"
        >
          ⚙️
          <div className="mt-1 text-sm font-semibold">
            Settings
          </div>
        </Link>

      </div>

    </div>
  );
}