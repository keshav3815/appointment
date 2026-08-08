import { useEffect, useState, type FormEvent } from "react";
import { apiClient, ApiError } from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface AdminRow {
  admin_id: number;
  username: string;
  full_name: string;
  email: string | null;
  role: string;
  last_login: string | null;
  created_at: string;
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_encryption: string;
  dev_mode: boolean;
}

function Message({ text, type }: { text: string; type: "success" | "danger" }) {
  return (
    <div
      className={`rounded-lg px-4 py-2.5 text-sm mb-4 ${
        type === "success"
          ? "bg-[rgba(16,185,129,0.12)] text-[var(--admin-success)]"
          : "bg-[rgba(239,68,68,0.12)] text-[var(--admin-danger)]"
      }`}
    >
      {text}
    </div>
  );
}

const cardClass = "bg-[var(--admin-glass)] backdrop-blur-xl border border-[var(--admin-border)] rounded-xl p-5";
const inputCls =
  "w-full bg-white/5 border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--admin-primary)]";
const labelCls = "block text-xs text-[var(--admin-text-muted)] mb-1";

export function SettingsPage() {
  const { admin } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [smtp, setSmtp] = useState<SmtpSettings | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", full_name: "", email: "", role: "admin" });

  const loadAdmins = () =>
    apiClient.get<{ success: boolean; admins: AdminRow[] }>("/admin/settings/admins").then((d) => setAdmins(d.admins));

  const loadSmtp = () =>
    apiClient
      .get<{ success: boolean; settings: SmtpSettings }>("/admin/settings/smtp")
      .then((d) => setSmtp(d.settings));

  useEffect(() => {
    loadAdmins();
    loadSmtp();
  }, []);

  const notify = (text: string, type: "success" | "danger") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(
        "/admin/settings/change-password",
        { current_password: pwCurrent, new_password: pwNew, confirm_password: pwConfirm }
      );
      notify(res.message, "success");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to change password.", "danger");
    }
  };

  const handleSaveSmtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!smtp) return;
    try {
      const res = await apiClient.put<{ success: boolean; message: string }>("/admin/settings/smtp", smtp);
      notify(res.message, "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to update SMTP settings.", "danger");
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>("/admin/settings/admins", newAdmin);
      notify(res.message, "success");
      setNewAdmin({ username: "", password: "", full_name: "", email: "", role: "admin" });
      loadAdmins();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to create admin.", "danger");
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm("Delete this admin user?")) return;
    try {
      const res = await apiClient.delete<{ success: boolean; message: string }>(`/admin/settings/admins/${id}`);
      notify(res.message, "success");
      loadAdmins();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete admin.", "danger");
    }
  };

  return (
    <div className="space-y-5">
      {msg && <Message text={msg.text} type={msg.type} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={cardClass}>
          <h2 className="font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className={labelCls}>Current Password</label>
              <input type="password" required value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input type="password" required minLength={6} value={pwNew} onChange={(e) => setPwNew(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" required value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className={inputCls} />
            </div>
            <button type="submit" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "var(--admin-primary)" }}>
              Update Password
            </button>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="font-semibold mb-4">Email / SMTP Settings</h2>
          {smtp && (
            <form onSubmit={handleSaveSmtp} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className={labelCls}>SMTP Host</label>
                  <input value={smtp.smtp_host} onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Port</label>
                  <input
                    type="number"
                    value={smtp.smtp_port}
                    onChange={(e) => setSmtp({ ...smtp, smtp_port: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>SMTP Username</label>
                <input value={smtp.smtp_username} onChange={(e) => setSmtp({ ...smtp, smtp_username: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>SMTP Password / App Password</label>
                <input
                  type="password"
                  value={smtp.smtp_password}
                  onChange={(e) => setSmtp({ ...smtp, smtp_password: e.target.value })}
                  className={inputCls}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={smtp.dev_mode}
                  onChange={(e) => setSmtp({ ...smtp, dev_mode: e.target.checked })}
                />
                DEV_MODE <small className="text-[var(--admin-text-muted)]">(show OTP in response when email fails)</small>
              </label>
              <button type="submit" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "var(--admin-primary)" }}>
                Save SMTP Settings
              </button>
            </form>
          )}
        </div>

        <div className={cardClass + " lg:col-span-2"}>
          <h2 className="font-semibold mb-4">Admin Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--admin-text-muted)]">
                  <th className="py-2">#</th>
                  <th className="py-2">Username</th>
                  <th className="py-2">Full Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Last Login</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.admin_id} className="border-t border-[var(--admin-border)]">
                    <td className="py-2">{a.admin_id}</td>
                    <td className="py-2 font-medium">{a.username}</td>
                    <td className="py-2">{a.full_name}</td>
                    <td className="py-2">{a.email ?? "—"}</td>
                    <td className="py-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: a.role === "superadmin" ? "var(--admin-danger)" : "var(--admin-primary)",
                          color: "#fff",
                        }}
                      >
                        {a.role}
                      </span>
                    </td>
                    <td className="py-2">{a.last_login ?? "—"}</td>
                    <td className="py-2">
                      {a.admin_id !== admin?.id && (
                        <button
                          onClick={() => handleDeleteAdmin(a.admin_id)}
                          className="text-[var(--admin-danger)] hover:underline text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="font-semibold mb-4">Add Admin User</h2>
          <form onSubmit={handleAddAdmin} className="space-y-3">
            <div>
              <label className={labelCls}>Username *</label>
              <input required value={newAdmin.username} onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Full Name *</label>
              <input required value={newAdmin.full_name} onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })} className={inputCls}>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
              style={{ background: "var(--admin-success)" }}
            >
              Create Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
