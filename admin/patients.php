<?php
/**
 * Admin — Patients Management
 */
declare(strict_types=1);
require_once __DIR__ . '/auth_check.php';

$pageTitle = 'Patients';
$pdo = getDBConnection();

// ---- Filters ----
$search = trim($_GET['search'] ?? '');
$page   = max(1, (int)($_GET['page'] ?? 1));
$perPage = 15;
$offset  = ($page - 1) * $perPage;

$where  = [];
$params = [];

if ($search !== '') {
    $where[] = '(p.full_name LIKE :s1 OR p.email LIKE :s2 OR p.mobile LIKE :s3)';
    $params[':s1'] = "%{$search}%";
    $params[':s2'] = "%{$search}%";
    $params[':s3'] = "%{$search}%";
}

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Count
$totalRows = (int)$pdo->prepare("SELECT COUNT(*) FROM patients p {$whereSQL}")
    ->execute($params) ? (int)$pdo->prepare("SELECT COUNT(*) FROM patients p {$whereSQL}")
    ->execute($params) : 0;

// Fix: proper count
$cStmt = $pdo->prepare("SELECT COUNT(*) FROM patients p {$whereSQL}");
$cStmt->execute($params);
$totalRows  = (int)$cStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalRows / $perPage));

// Fetch
$dStmt = $pdo->prepare(
    "SELECT p.*,
            (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.patient_id) AS apt_count,
            (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.patient_id = p.patient_id) AS last_visit
       FROM patients p
       {$whereSQL}
      ORDER BY p.created_at DESC
      LIMIT {$perPage} OFFSET {$offset}"
);
$dStmt->execute($params);
$patients = $dStmt->fetchAll();
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

        <!-- Filters -->
        <div class="admin-card mb-4">
            <div class="admin-card-body">
                <form method="GET" class="row g-2 align-items-end">
                    <div class="col-md-5">
                        <label class="form-label form-label-sm">Search</label>
                        <input type="text" name="search" class="form-control form-control-sm"
                               placeholder="Name, email or mobile" value="<?= sanitise($search) ?>">
                    </div>
                    <div class="col-auto d-flex gap-1">
                        <button class="btn btn-primary btn-sm"><i class="fa-solid fa-search"></i> Search</button>
                        <a href="patients.php" class="btn btn-outline-secondary btn-sm"><i class="fa-solid fa-rotate-left"></i></a>
                    </div>
                </form>
            </div>
        </div>

        <!-- Table -->
        <div class="admin-card mb-4">
            <div class="admin-card-header">
                <i class="fa-solid fa-users"></i> Patients (<?= $totalRows ?>)
            </div>
            <div class="admin-card-body p-0">
                <div class="table-responsive">
                <table class="table admin-table mb-0">
                    <thead>
                        <tr>
                            <th>#ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Mobile</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>City</th>
                            <th>State</th>
                            <th>Appointments</th>
                            <th>Last Visit</th>
                            <th>Registered</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($patients)): ?>
                        <tr><td colspan="11" class="text-center text-muted py-4">No patients found.</td></tr>
                    <?php else: ?>
                        <?php foreach ($patients as $p): ?>
                        <tr>
                            <td><strong>#<?= $p['patient_id'] ?></strong></td>
                            <td class="fw-semibold"><?= sanitise($p['full_name']) ?></td>
                            <td><small><?= sanitise($p['email']) ?></small></td>
                            <td><?= sanitise($p['mobile']) ?></td>
                            <td><?= sanitise($p['gender']) ?></td>
                            <td><?= $p['age'] ?>y</td>
                            <td><?= sanitise($p['city'] ?? '—') ?></td>
                            <td><?= sanitise($p['state'] ?? '—') ?></td>
                            <td><span class="badge bg-primary"><?= $p['apt_count'] ?></span></td>
                            <td><?= $p['last_visit'] ? date('d M Y', strtotime($p['last_visit'])) : '—' ?></td>
                            <td><?= date('d M Y', strtotime($p['created_at'])) ?></td>
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
                    <a class="page-link" href="?search=<?= urlencode($search) ?>&page=<?= $page-1 ?>">Prev</a>
                </li>
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                    <a class="page-link" href="?search=<?= urlencode($search) ?>&page=<?= $i ?>"><?= $i ?></a>
                </li>
                <?php endfor; ?>
                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                    <a class="page-link" href="?search=<?= urlencode($search) ?>&page=<?= $page+1 ?>">Next</a>
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
