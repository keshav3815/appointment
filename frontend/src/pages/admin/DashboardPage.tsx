import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { StatCard } from "../../components/admin/StatCard";
import { PaymentBadge, PaymentStatusBadge, StatusBadge } from "../../components/admin/badges";

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
  department_breakdown: { department: string; count: number }[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    apiClient.get<DashboardData>("/admin/dashboard").then(setData);
  }, []);

  if (!data) return <div className="text-[var(--admin-text-muted)]">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Appointments" value={String(data.total_appointments)} accent="var(--admin-primary)" />
        <StatCard label="Today's Appointments" value={String(data.today_appointments)} accent="var(--admin-success)" />
        <StatCard label="Total Patients" value={String(data.total_patients)} accent="var(--admin-info)" />
        <StatCard label="Total Revenue" value={`₹${data.total_revenue.toLocaleString()}`} accent="var(--admin-warning)" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-5">
          <div className="font-semibold mb-3">Appointment Status</div>
          <div className="flex gap-3 flex-wrap text-sm">
            <StatusBadge status="Pending" /> {data.pending_count}
            <StatusBadge status="Confirmed" /> {data.confirmed_count}
            <StatusBadge status="Cancelled" /> {data.cancelled_count}
          </div>
        </div>
        <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-5">
          <div className="font-semibold mb-3">Top Departments</div>
          {data.department_breakdown.length === 0 ? (
            <p className="text-[var(--admin-text-muted)] text-sm">No data yet.</p>
          ) : (
            data.department_breakdown.map((d) => (
              <div key={d.department} className="flex justify-between py-1 text-sm">
                <span>{d.department}</span>
                <span className="font-semibold text-[var(--admin-primary)]">{d.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 border-b border-[var(--admin-border)]">
          <span className="font-semibold">Recent Appointments</span>
          <Link to="/admin/appointments" className="text-sm text-[var(--admin-accent)] hover:underline">
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
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[var(--admin-text-muted)]">
                    No appointments yet.
                  </td>
                </tr>
              ) : (
                data.recent_appointments.map((a) => (
                  <tr key={a.appointment_id} className="border-t border-[var(--admin-border)]">
                    <td className="px-5 py-2.5 font-semibold">#{a.appointment_id}</td>
                    <td className="px-5 py-2.5">{a.full_name}</td>
                    <td className="px-5 py-2.5">{a.department}</td>
                    <td className="px-5 py-2.5">{a.appointment_date}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-2.5">
                      <PaymentBadge status={a.payment_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 border-b border-[var(--admin-border)]">
          <span className="font-semibold">Recent Payments</span>
          <Link to="/admin/payments" className="text-sm text-[var(--admin-accent)] hover:underline">
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
                  <td colSpan={5} className="text-center py-6 text-[var(--admin-text-muted)]">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                data.recent_payments.map((p) => (
                  <tr key={p.payment_id} className="border-t border-[var(--admin-border)]">
                    <td className="px-5 py-2.5 font-semibold">#{p.appointment_id}</td>
                    <td className="px-5 py-2.5">{p.full_name}</td>
                    <td className="px-5 py-2.5 font-semibold">₹{p.amount}</td>
                    <td className="px-5 py-2.5">
                      <code className="text-xs">{p.transaction_id ?? "—"}</code>
                    </td>
                    <td className="px-5 py-2.5">
                      <PaymentStatusBadge status={p.payment_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
