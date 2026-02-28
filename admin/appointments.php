<?php
/**
 * Admin — Appointments Management
 * Full CRUD with status change, search, filter, pagination
 */
declare(strict_types=1);
require_once __DIR__ . '/auth_check.php';

$pageTitle = 'Appointments';
$pdo = getDBConnection();

// ---- Filters ----
$search  = trim($_GET['search'] ?? '');
$status  = trim($_GET['status'] ?? '');
$payment = trim($_GET['payment'] ?? '');
$dateFrom = trim($_GET['date_from'] ?? '');
$dateTo   = trim($_GET['date_to'] ?? '');
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = 15;
$offset  = ($page - 1) * $perPage;

// ---- Build WHERE clause ----
$where  = [];
$params = [];

if ($search !== '') {
    $where[]  = '(p.full_name LIKE :search OR p.email LIKE :search2 OR p.mobile LIKE :search3 OR a.appointment_id = :search_id)';
    $params[':search']    = "%{$search}%";
    $params[':search2']   = "%{$search}%";
    $params[':search3']   = "%{$search}%";
    $params[':search_id'] = (int)$search;
}
if ($status !== '' && in_array($status, ['Pending','Confirmed','Cancelled','Completed'])) {
    $where[]  = 'a.status = :status';
    $params[':status'] = $status;
}
if ($payment !== '' && in_array($payment, ['Paid','Unpaid','Failed','Refunded'])) {
    $where[]  = 'a.payment_status = :payment';
    $params[':payment'] = $payment;
}
if ($dateFrom !== '') {
    $where[] = 'a.appointment_date >= :date_from';
    $params[':date_from'] = $dateFrom;
}
if ($dateTo !== '') {
    $where[] = 'a.appointment_date <= :date_to';
    $params[':date_to'] = $dateTo;
}

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// ---- Count total ----
$countStmt = $pdo->prepare(
    "SELECT COUNT(*) FROM appointments a JOIN patients p ON p.patient_id = a.patient_id {$whereSQL}"
);
$countStmt->execute($params);
$totalRows  = (int)$countStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalRows / $perPage));

// ---- Fetch data ----
$dataStmt = $pdo->prepare(
    "SELECT a.*, p.full_name, p.email, p.mobile, p.gender, p.age,
            p.society, p.city, p.state
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
       {$whereSQL}
      ORDER BY a.created_at DESC
      LIMIT {$perPage} OFFSET {$offset}"
);
$dataStmt->execute($params);
$appointments = $dataStmt->fetchAll();

// Helper: keep query string
function qs(array $extra = []): string {
    $p = array_merge($_GET, $extra);
    unset($p['page']);
    return http_build_query($p);
}
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

        <!-- ========== FILTERS ========== -->
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                <i class="fa-solid fa-filter"></i> Filter Appointments
            </div>
            <div class="admin-card-body">
                <form method="GET" class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="form-label form-label-sm">Search</label>
                        <input type="text" name="search" class="form-control form-control-sm"
                               placeholder="Name, email, mobile, ID" value="<?= sanitise($search) ?>">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label form-label-sm">Status</label>
                        <select name="status" class="form-select form-select-sm">
                            <option value="">All</option>
                            <?php foreach (['Pending','Confirmed','Cancelled','Completed'] as $s): ?>
                            <option <?= $status === $s ? 'selected' : '' ?>><?= $s ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label form-label-sm">Payment</label>
                        <select name="payment" class="form-select form-select-sm">
                            <option value="">All</option>
                            <?php foreach (['Paid','Unpaid','Failed','Refunded'] as $ps): ?>
                            <option <?= $payment === $ps ? 'selected' : '' ?>><?= $ps ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label form-label-sm">From</label>
                        <input type="date" name="date_from" class="form-control form-control-sm" value="<?= sanitise($dateFrom) ?>">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label form-label-sm">To</label>
                        <input type="date" name="date_to" class="form-control form-control-sm" value="<?= sanitise($dateTo) ?>">
                    </div>
                    <div class="col-md-1 d-flex gap-1">
                        <button class="btn btn-primary btn-sm"><i class="fa-solid fa-search"></i></button>
                        <a href="appointments.php" class="btn btn-outline-secondary btn-sm" title="Reset"><i class="fa-solid fa-rotate-left"></i></a>
                    </div>
                </form>
            </div>
        </div>

        <!-- ========== TABLE ========== -->
        <div class="admin-card mb-4">
            <div class="admin-card-header d-flex justify-content-between align-items-center">
                <span><i class="fa-solid fa-calendar-check"></i> Appointments (<?= $totalRows ?>)</span>
            </div>
            <div class="admin-card-body p-0">
                <div class="table-responsive">
                <table class="table admin-table mb-0">
                    <thead>
                        <tr>
                            <th>#ID</th>
                            <th>Patient</th>
                            <th>Contact</th>
                            <th>Department</th>
                            <th>Doctor</th>
                            <th>Date</th>
                            <th>Slot</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($appointments)): ?>
                        <tr><td colspan="11" class="text-center text-muted py-4">No appointments found.</td></tr>
                    <?php else: ?>
                        <?php foreach ($appointments as $a): ?>
                        <tr>
                            <td><strong>#<?= $a['appointment_id'] ?></strong></td>
                            <td>
                                <div class="fw-semibold"><?= sanitise($a['full_name']) ?></div>
                                <small class="text-muted"><?= sanitise($a['gender']) ?>, <?= $a['age'] ?>y</small>
                            </td>
                            <td>
                                <div><small><?= sanitise($a['email']) ?></small></div>
                                <small class="text-muted"><?= sanitise($a['mobile']) ?></small>
                            </td>
                            <td><?= sanitise($a['department']) ?></td>
                            <td><?= sanitise($a['doctor'] ?: '—') ?></td>
                            <td class="text-nowrap"><?= date('d M Y', strtotime($a['appointment_date'])) ?></td>
                            <td class="text-nowrap"><?= sanitise($a['time_slot']) ?></td>
                            <td><span class="badge bg-primary-subtle text-primary"><?= sanitise($a['appointment_type']) ?></span></td>
                            <td>
                                <select class="form-select form-select-sm status-change"
                                        data-id="<?= $a['appointment_id'] ?>" data-field="status"
                                        style="min-width:110px;">
                                    <?php foreach (['Pending','Confirmed','Cancelled','Completed'] as $s): ?>
                                    <option <?= $a['status'] === $s ? 'selected' : '' ?>><?= $s ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                            <td>
                                <select class="form-select form-select-sm status-change"
                                        data-id="<?= $a['appointment_id'] ?>" data-field="payment_status"
                                        style="min-width:100px;">
                                    <?php foreach (['Unpaid','Paid','Failed','Refunded'] as $ps): ?>
                                    <option <?= $a['payment_status'] === $ps ? 'selected' : '' ?>><?= $ps ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                            <td>
                                <button class="btn btn-outline-info btn-sm view-detail"
                                        data-id="<?= $a['appointment_id'] ?>" title="View Details">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-apt"
                                        data-id="<?= $a['appointment_id'] ?>" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
                </div>
            </div>
        </div>

        <!-- ========== PAGINATION ========== -->
        <?php if ($totalPages > 1): ?>
        <nav>
            <ul class="pagination pagination-sm justify-content-center">
                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                    <a class="page-link" href="?<?= qs() ?>&page=<?= $page-1 ?>">Prev</a>
                </li>
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                    <a class="page-link" href="?<?= qs() ?>&page=<?= $i ?>"><?= $i ?></a>
                </li>
                <?php endfor; ?>
                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                    <a class="page-link" href="?<?= qs() ?>&page=<?= $page+1 ?>">Next</a>
                </li>
            </ul>
        </nav>
        <?php endif; ?>

    </div>
</div>

<!-- Detail Modal -->
<div class="modal fade" id="detailModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fa-solid fa-eye"></i> Appointment Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="detailBody">
                <div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin fa-2x text-muted"></i></div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/admin.js"></script>
</body>
</html>
