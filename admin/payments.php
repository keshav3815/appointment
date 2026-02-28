<?php
/**
 * Admin — Payments Management
 */
declare(strict_types=1);
require_once __DIR__ . '/auth_check.php';

$pageTitle = 'Payments';
$pdo = getDBConnection();

// ---- Filters ----
$search  = trim($_GET['search'] ?? '');
$status  = trim($_GET['status'] ?? '');
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = 15;
$offset  = ($page - 1) * $perPage;

$where  = [];
$params = [];

if ($search !== '') {
    $where[] = '(pt.full_name LIKE :s1 OR py.transaction_id LIKE :s2 OR py.razorpay_order_id LIKE :s3)';
    $params[':s1'] = "%{$search}%";
    $params[':s2'] = "%{$search}%";
    $params[':s3'] = "%{$search}%";
}
if ($status !== '' && in_array($status, ['Created','Authorized','Captured','Failed','Refunded'])) {
    $where[]  = 'py.payment_status = :st';
    $params[':st'] = $status;
}

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$cStmt = $pdo->prepare("SELECT COUNT(*) FROM payments py JOIN appointments a ON a.appointment_id = py.appointment_id JOIN patients pt ON pt.patient_id = a.patient_id {$whereSQL}");
$cStmt->execute($params);
$totalRows  = (int)$cStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalRows / $perPage));

// Also compute summary stats
$totalCaptured = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE payment_status='Captured'")->fetchColumn();
$totalCreated  = (int)$pdo->query("SELECT COUNT(*) FROM payments WHERE payment_status='Created'")->fetchColumn();
$totalFailed   = (int)$pdo->query("SELECT COUNT(*) FROM payments WHERE payment_status='Failed'")->fetchColumn();

$dStmt = $pdo->prepare(
    "SELECT py.*, a.appointment_id, a.department, a.appointment_date,
            pt.full_name, pt.email, pt.mobile
       FROM payments py
       JOIN appointments a ON a.appointment_id = py.appointment_id
       JOIN patients pt ON pt.patient_id = a.patient_id
       {$whereSQL}
      ORDER BY py.created_at DESC
      LIMIT {$perPage} OFFSET {$offset}"
);
$dStmt->execute($params);
$payments = $dStmt->fetchAll();
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

        <!-- Revenue summary -->
        <div class="row g-3 mb-4">
            <div class="col-sm-4">
                <div class="stat-card stat-success">
                    <div class="stat-icon"><i class="fa-solid fa-indian-rupee-sign"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">₹<?= number_format($totalCaptured, 0) ?></div>
                        <div class="stat-label">Total Captured</div>
                    </div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="stat-card stat-warning">
                    <div class="stat-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                    <div class="stat-info">
                        <div class="stat-value"><?= $totalCreated ?></div>
                        <div class="stat-label">Pending Orders</div>
                    </div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="stat-card stat-danger">
                    <div class="stat-icon"><i class="fa-solid fa-xmark"></i></div>
                    <div class="stat-info">
                        <div class="stat-value"><?= $totalFailed ?></div>
                        <div class="stat-label">Failed Payments</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="admin-card mb-4">
            <div class="admin-card-body">
                <form method="GET" class="row g-2 align-items-end">
                    <div class="col-md-4">
                        <label class="form-label form-label-sm">Search</label>
                        <input type="text" name="search" class="form-control form-control-sm"
                               placeholder="Patient name, txn ID, order ID" value="<?= sanitise($search) ?>">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label form-label-sm">Status</label>
                        <select name="status" class="form-select form-select-sm">
                            <option value="">All</option>
                            <?php foreach (['Created','Authorized','Captured','Failed','Refunded'] as $s): ?>
                            <option <?= $status === $s ? 'selected' : '' ?>><?= $s ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-auto d-flex gap-1">
                        <button class="btn btn-primary btn-sm"><i class="fa-solid fa-search"></i> Filter</button>
                        <a href="payments.php" class="btn btn-outline-secondary btn-sm"><i class="fa-solid fa-rotate-left"></i></a>
                    </div>
                </form>
            </div>
        </div>

        <!-- Table -->
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                <i class="fa-solid fa-credit-card"></i> Payments (<?= $totalRows ?>)
            </div>
            <div class="admin-card-body p-0">
                <div class="table-responsive">
                <table class="table admin-table mb-0">
                    <thead>
                        <tr>
                            <th>Payment #</th>
                            <th>Apt #</th>
                            <th>Patient</th>
                            <th>Amount</th>
                            <th>Order ID</th>
                            <th>Transaction ID</th>
                            <th>Gateway</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($payments)): ?>
                        <tr><td colspan="9" class="text-center text-muted py-4">No payments found.</td></tr>
                    <?php else: ?>
                        <?php foreach ($payments as $py): ?>
                        <tr>
                            <td><strong>#<?= $py['payment_id'] ?></strong></td>
                            <td>#<?= $py['appointment_id'] ?></td>
                            <td>
                                <div class="fw-semibold"><?= sanitise($py['full_name']) ?></div>
                                <small class="text-muted"><?= sanitise($py['email']) ?></small>
                            </td>
                            <td class="fw-bold">₹<?= number_format((float)$py['amount'], 2) ?></td>
                            <td><code class="small"><?= sanitise($py['razorpay_order_id'] ?? '—') ?></code></td>
                            <td><code class="small"><?= sanitise($py['transaction_id'] ?? '—') ?></code></td>
                            <td><?= sanitise($py['payment_gateway']) ?></td>
                            <td>
                                <?php
                                $badgeMap = ['Created'=>'secondary','Authorized'=>'info','Captured'=>'success','Failed'=>'danger','Refunded'=>'warning'];
                                $cls = $badgeMap[$py['payment_status']] ?? 'secondary';
                                ?>
                                <span class="badge bg-<?= $cls ?>"><?= $py['payment_status'] ?></span>
                            </td>
                            <td class="text-nowrap"><?= date('d M Y H:i', strtotime($py['created_at'])) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <?php if ($totalPages > 1): ?>
        <nav>
            <ul class="pagination pagination-sm justify-content-center">
                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                    <a class="page-link" href="?search=<?= urlencode($search) ?>&status=<?= urlencode($status) ?>&page=<?= $page-1 ?>">Prev</a>
                </li>
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                    <a class="page-link" href="?search=<?= urlencode($search) ?>&status=<?= urlencode($status) ?>&page=<?= $i ?>"><?= $i ?></a>
                </li>
                <?php endfor; ?>
                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                    <a class="page-link" href="?search=<?= urlencode($search) ?>&status=<?= urlencode($status) ?>&page=<?= $page+1 ?>">Next</a>
                </li>
            </ul>
        </nav>
        <?php endif; ?>

    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/admin.js"></script>
</body>
</html>
