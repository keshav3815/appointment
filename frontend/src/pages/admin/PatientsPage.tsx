import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

interface PatientRow {
  patient_id: number;
  full_name: string;
  email: string;
  mobile: string;
  gender: string;
  age: number;
  city: string | null;
  state: string | null;
  apt_count: number;
  last_visit: string | null;
  created_at: string;
}

export function PatientsPage() {
  const [items, setItems] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));

    apiClient
      .get<{ items: PatientRow[]; total: number; total_pages: number }>(
        `/admin/patients?${params.toString()}`
      )
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      });
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", "1");
    apiClient
      .get<{ items: PatientRow[]; total: number; total_pages: number }>(
        `/admin/patients?${params.toString()}`
      )
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      });
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-4 flex gap-3 items-end">
        <div>
          <label className="block text-xs text-[var(--admin-text-muted)] mb-1">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Name, email or mobile"
            className="bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-sm w-64"
          />
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
        <div className="px-5 py-3 border-b border-[var(--admin-border)] font-semibold">Patients ({total})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--admin-text-muted)]">
                <th className="px-4 py-2">#ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Mobile</th>
                <th className="px-4 py-2">Gender</th>
                <th className="px-4 py-2">Age</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Appointments</th>
                <th className="px-4 py-2">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-[var(--admin-text-muted)]">
                    No patients found.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.patient_id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2.5 font-semibold">#{p.patient_id}</td>
                    <td className="px-4 py-2.5">{p.full_name}</td>
                    <td className="px-4 py-2.5 text-xs">{p.email}</td>
                    <td className="px-4 py-2.5">{p.mobile}</td>
                    <td className="px-4 py-2.5">{p.gender}</td>
                    <td className="px-4 py-2.5">{p.age}y</td>
                    <td className="px-4 py-2.5">{p.city ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: "var(--admin-primary)", color: "#fff" }}
                      >
                        {p.apt_count}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{p.last_visit ?? "—"}</td>
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
