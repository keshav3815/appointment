<?php
/**
 * Admin Dashboard — Overview with stats & recent data
 */
declare(strict_types=1);
require_once __DIR__ . '/auth_check.php';

$pageTitle = 'Dashboard';
$pdo = getDBConnection();

// ---- Stats ----
$totalAppointments = (int)$pdo->query('SELECT COUNT(*) FROM appointments')->fetchColumn();
$todayAppointments = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE()")->fetchColumn();
$totalPatients     = (int)$pdo->query('SELECT COUNT(*) FROM patients')->fetchColumn();
$totalRevenue      = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE payment_status = 'Captured'")->fetchColumn();
$pendingCount      = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn();
$confirmedCount    = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'Confirmed'")->fetchColumn();
$cancelledCount    = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'Cancelled'")->fetchColumn();
$paidCount         = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE payment_status = 'Paid'")->fetchColumn();
$unpaidCount       = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE payment_status = 'Unpaid'")->fetchColumn();

// ---- Recent Appointments ----
$recentApts = $pdo->query(
    "SELECT a.appointment_id, a.department, a.doctor, a.appointment_date,
            a.time_slot, a.status, a.payment_status, p.full_name, p.email
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
      ORDER BY a.created_at DESC
      LIMIT 10"
)->fetchAll();

// ---- Recent Payments ----
$recentPayments = $pdo->query(
    "SELECT py.payment_id, py.amount, py.transaction_id, py.payment_status,
            py.created_at, p.full_name, a.appointment_id
       FROM payments py
       JOIN appointments a ON a.appointment_id = py.appointment_id
       JOIN patients p ON p.patient_id = a.patient_id
      ORDER BY py.created_at DESC
      LIMIT 5"
)->fetchAll();

// ---- Department breakdown ----
$deptStats = $pdo->query(
    "SELECT department, COUNT(*) as cnt FROM appointments GROUP BY department ORDER BY cnt DESC LIMIT 6"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= $pageTitle ?> — Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link href="assets/css/admin.css" rel="stylesheet">
</head>
<body class="admin-body">

<?php include 'partials/sidebar.php'; ?>

<div class="admin-main" id="adminMain">
    <?php include 'partials/topbar.php'; ?>

    <div class="admin-content">

        <!-- ========== STAT CARDS ========== -->
        <div class="row g-3 mb-4">
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card stat-primary">
                    <div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div>
                    <div class="stat-info">
                        <div class="stat-value"><?= $totalAppointments ?></div>
                        <div class="stat-label">Total Appointments</div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card stat-success">
                    <div class="stat-icon"><i class="fa-solid fa-calendar-day"></i></div>
                    <div class="stat-info">
                        <div class="stat-value"><?= $todayAppointments ?></div>
                        <div class="stat-label">Today's Appointments</div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card stat-info">
                    <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                    <div class="stat-info">
                        <div class="stat-value"><?= $totalPatients ?></div>
                        <div class="stat-label">Total Patients</div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 col-xl-3">
                <div class="stat-card stat-warning">
                    <div class="stat-icon"><i class="fa-solid fa-indian-rupee-sign"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">₹<?= number_format($totalRevenue, 0) ?></div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== STATUS OVERVIEW ========== -->
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <div class="admin-card">
                    <div class="admin-card-header">
                        <i class="fa-solid fa-chart-pie"></i> Appointment Status
                    </div>
                    <div class="admin-card-body">
                        <div class="status-pills">
                            <span class="pill pill-warning"><i class="fa-solid fa-clock"></i> Pending: <?= $pendingCount ?></span>
                            <span class="pill pill-success"><i class="fa-solid fa-check"></i> Confirmed: <?= $confirmedCount ?></span>
                            <span class="pill pill-danger"><i class="fa-solid fa-xmark"></i> Cancelled: <?= $cancelledCount ?></span>
                        </div>
                        <div class="progress-stack mt-3">
                            <?php $total = max($totalAppointments, 1); ?>
                            <div class="progress" style="height: 10px;">
                                <div class="progress-bar bg-warning" style="width:<?= round($pendingCount/$total*100) ?>%" title="Pending"></div>
                                <div class="progress-bar bg-success" style="width:<?= round($confirmedCount/$total*100) ?>%" title="Confirmed"></div>
                                <div class="progress-bar bg-danger" style="width:<?= round($cancelledCount/$total*100) ?>%" title="Cancelled"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="admin-card">
                    <div class="admin-card-header">
                        <i class="fa-solid fa-stethoscope"></i> Top Departments
                    </div>
                    <div class="admin-card-body">
                        <?php if (empty($deptStats)): ?>
                            <p class="text-muted">No data yet.</p>
                        <?php else: ?>
                            <?php foreach ($deptStats as $d): ?>
                            <div class="dept-row">
                                <span><?= sanitise($d['department']) ?></span>
                                <span class="badge bg-primary-subtle text-primary"><?= $d['cnt'] ?></span>
                            </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== RECENT APPOINTMENTS TABLE ========== -->
        <div class="admin-card mb-4">
            <div class="admin-card-header d-flex justify-content-between align-items-center">
                <span><i class="fa-solid fa-list"></i> Recent Appointments</span>
                <a href="appointments.php" class="btn btn-sm btn-outline-primary">View All</a>
            </div>
            <div class="admin-card-body p-0">
                <div class="table-responsive">
                <table class="table admin-table mb-0">
                    <thead>
                        <tr>
                            <th>#ID</th>
                            <th>Patient</th>
                            <th>Department</th>
                            <th>Date</th>
                            <th>Slot</th>
                            <th>Status</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($recentApts)): ?>
                        <tr><td colspan="7" class="text-center text-muted py-4">No appointments yet.</td></tr>
                    <?php else: ?>
                        <?php foreach ($recentApts as $a): ?>
                        <tr>
                            <td><strong>#<?= $a['appointment_id'] ?></strong></td>
                            <td><?= sanitise($a['full_name']) ?></td>
                            <td><?= sanitise($a['department']) ?></td>
                            <td><?= date('d M Y', strtotime($a['appointment_date'])) ?></td>
                            <td><?= sanitise($a['time_slot']) ?></td>
                            <td><?= statusBadge($a['status']) ?></td>
                            <td><?= paymentBadge($a['payment_status']) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
                </div>
            </div>
        </div>

        <!-- ========== RECENT PAYMENTS ========== -->
        <div class="admin-card mb-4">
            <div class="admin-card-header d-flex justify-content-between align-items-center">
                <span><i class="fa-solid fa-receipt"></i> Recent Payments</span>
                <a href="payments.php" class="btn btn-sm btn-outline-primary">View All</a>
            </div>
            <div class="admin-card-body p-0">
                <div class="table-responsive">
                <table class="table admin-table mb-0">
                    <thead>
                        <tr>
                            <th>Apt #</th>
                            <th>Patient</th>
                            <th>Amount</th>
                            <th>Transaction ID</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($recentPayments)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4">No payments yet.</td></tr>
                    <?php else: ?>
                        <?php foreach ($recentPayments as $py): ?>
                        <tr>
                            <td><strong>#<?= $py['appointment_id'] ?></strong></td>
                            <td><?= sanitise($py['full_name']) ?></td>
                            <td class="fw-bold">₹<?= number_format((float)$py['amount'], 2) ?></td>
                            <td><code><?= sanitise($py['transaction_id'] ?? '—') ?></code></td>
                            <td><?= paymentStatusBadge($py['payment_status']) ?></td>
                            <td><?= date('d M Y H:i', strtotime($py['created_at'])) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
                </div>
            </div>
        </div>

    </div><!-- admin-content -->
</div><!-- admin-main -->

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/admin.js"></script>
</body>
</html>
<?php
/* ---- Helper badge functions ---- */
function statusBadge(string $status): string {
    $map = [
        'Pending'   => 'warning',
        'Confirmed' => 'success',
        'Cancelled' => 'danger',
        'Completed' => 'info',
    ];
    $cls = $map[$status] ?? 'secondary';
    return "<span class='badge bg-{$cls}'>{$status}</span>";
}

function paymentBadge(string $status): string {
    $map = [
        'Paid'     => 'success',
        'Unpaid'   => 'warning',
        'Failed'   => 'danger',
        'Refunded' => 'info',
    ];
    $cls = $map[$status] ?? 'secondary';
    return "<span class='badge bg-{$cls}'>{$status}</span>";
}

function paymentStatusBadge(string $status): string {
    $map = [
        'Created'    => 'secondary',
        'Authorized' => 'info',
        'Captured'   => 'success',
        'Failed'     => 'danger',
        'Refunded'   => 'warning',
    ];
    $cls = $map[$status] ?? 'secondary';
    return "<span class='badge bg-{$cls}'>{$status}</span>";
}
