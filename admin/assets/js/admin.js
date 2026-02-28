/**
 * Admin Panel — Core JavaScript
 */
document.addEventListener('DOMContentLoaded', () => {
    /* ========== Sidebar Toggle ========== */
    const sidebar  = document.querySelector('.admin-sidebar');
    const main     = document.getElementById('adminMain');
    const toggle   = document.getElementById('sidebarToggle');
    let overlay    = document.querySelector('.sidebar-overlay');

    // Create overlay element for mobile
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    if (toggle && sidebar && main) {
        toggle.addEventListener('click', () => {
            const isMobile = window.innerWidth < 992;
            if (isMobile) {
                sidebar.classList.toggle('show');
                overlay.classList.toggle('show');
            } else {
                sidebar.classList.toggle('collapsed');
                main.classList.toggle('expanded');
            }
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }

    /* ========== inline status change (appointments) ========== */
    document.querySelectorAll('.status-change').forEach(select => {
        select.addEventListener('change', async function () {
            const appointmentId = this.dataset.id;
            const field         = this.dataset.field;   // 'status' or 'payment_status'
            const value         = this.value;
            const row           = this.closest('tr');

            try {
                const fd = new FormData();
                fd.append('appointment_id', appointmentId);
                fd.append('field', field);
                fd.append('value', value);

                const resp = await fetch('controllers/update_status.php', {
                    method: 'POST',
                    body: fd
                });
                const data = await resp.json();

                if (data.success) {
                    // flash green
                    row.style.transition = 'background .3s';
                    row.style.background = 'rgba(16,185,129,0.1)';
                    setTimeout(() => row.style.background = '', 800);
                } else {
                    alert(data.error || 'Update failed');
                    location.reload();
                }
            } catch (e) {
                alert('Network error');
                location.reload();
            }
        });
    });

    /* ========== Delete appointment ========== */
    document.querySelectorAll('.delete-apt').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            if (!confirm('Are you sure you want to delete this appointment? This cannot be undone.')) return;

            const appointmentId = this.dataset.id;
            const row = this.closest('tr');

            try {
                const fd = new FormData();
                fd.append('appointment_id', appointmentId);

                const resp = await fetch('controllers/delete_appointment.php', {
                    method: 'POST',
                    body: fd
                });
                const data = await resp.json();

                if (data.success) {
                    row.style.transition = 'opacity .3s';
                    row.style.opacity = '0';
                    setTimeout(() => row.remove(), 300);
                } else {
                    alert(data.error || 'Delete failed');
                }
            } catch (e) {
                alert('Network error');
            }
        });
    });

    /* ========== View appointment detail (modal) ========== */
    const detailModal = document.getElementById('detailModal');
    const detailBody  = document.getElementById('detailBody');

    document.querySelectorAll('.view-detail').forEach(btn => {
        btn.addEventListener('click', async function () {
            const appointmentId = this.dataset.id;
            if (detailBody) detailBody.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

            try {
                const resp = await fetch(`controllers/get_detail.php?id=${appointmentId}`);
                const data = await resp.json();

                if (data.success) {
                    const a = data.appointment;
                    detailBody.innerHTML = `
                        <div class="detail-grid">
                            <div class="detail-item">
                                <div class="detail-label">Patient Name</div>
                                <div class="detail-value">${esc(a.full_name)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Email</div>
                                <div class="detail-value">${esc(a.email)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Mobile</div>
                                <div class="detail-value">${esc(a.mobile)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Gender / Age</div>
                                <div class="detail-value">${esc(a.gender)} / ${esc(a.age)} yrs</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Address</div>
                                <div class="detail-value">${esc(a.society || '—')}, ${esc(a.city || '—')}, ${esc(a.state || '—')}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Department</div>
                                <div class="detail-value">${esc(a.department)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Appointment Date</div>
                                <div class="detail-value">${esc(a.appointment_date)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Time Slot</div>
                                <div class="detail-value">${esc(a.time_slot)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Status</div>
                                <div class="detail-value"><span class="badge bg-${statusColor(a.status)}">${esc(a.status)}</span></div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Payment</div>
                                <div class="detail-value"><span class="badge bg-${paymentColor(a.payment_status)}">${esc(a.payment_status)}</span></div>
                            </div>
                        </div>
                        ${a.notes ? `<div class="mt-3"><div class="detail-label">Notes</div><div class="detail-value">${esc(a.notes)}</div></div>` : ''}
                        <hr style="border-color:rgba(255,255,255,0.08)">
                        <div class="row">
                            <div class="col-6"><small class="text-muted">Created</small><br><small>${esc(a.created_at)}</small></div>
                            <div class="col-6"><small class="text-muted">Apt ID</small><br><small>#${a.appointment_id}</small></div>
                        </div>
                    `;
                } else {
                    detailBody.innerHTML = `<div class="text-danger">${data.error || 'Failed to load'}</div>`;
                }
            } catch (e) {
                detailBody.innerHTML = '<div class="text-danger">Network error</div>';
            }
        });
    });

    /* ========== Helpers ========== */
    function esc(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function statusColor(s) {
        const map = { Pending: 'warning', Confirmed: 'success', Cancelled: 'danger', Completed: 'info' };
        return map[s] || 'secondary';
    }

    function paymentColor(s) {
        const map = { Pending: 'warning', Completed: 'success', Failed: 'danger', Refunded: 'info' };
        return map[s] || 'secondary';
    }
});
