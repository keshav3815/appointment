<?php
/**
 * Admin — Settings (Superadmin Only)
 */
declare(strict_types=1);
require_once __DIR__ . '/auth_check.php';

// Only superadmin
if ($adminRole !== 'superadmin') {
    header('Location: index.php');
    exit;
}

$pageTitle = 'Settings';
$pdo = getDBConnection();
$message = '';
$msgType = '';

// ---- Handle form submissions ----

// 1) Add Admin User
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'add_admin') {
    $uname  = trim($_POST['username'] ?? '');
    $upass  = trim($_POST['password'] ?? '');
    $ufname = trim($_POST['full_name'] ?? '');
    $uemail = trim($_POST['email'] ?? '');
    $urole  = in_array($_POST['role'] ?? '', ['admin','superadmin']) ? $_POST['role'] : 'admin';

    if ($uname === '' || $upass === '' || $ufname === '') {
        $message = 'Username, password, and full name are required.';
        $msgType = 'danger';
    } else {
        // check uniqueness
        $ck = $pdo->prepare("SELECT COUNT(*) FROM admin_users WHERE username = ?");
        $ck->execute([$uname]);
        if ((int)$ck->fetchColumn() > 0) {
            $message = "Username '{$uname}' already exists.";
            $msgType = 'danger';
        } else {
            $ins = $pdo->prepare("INSERT INTO admin_users (username, password, full_name, email, role)
                                  VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$uname, password_hash($upass, PASSWORD_DEFAULT), $ufname, $uemail, $urole]);
            $message = "Admin user '{$uname}' created successfully.";
            $msgType = 'success';
        }
    }
}

// 2) Delete Admin User
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_admin') {
    $delId = (int)($_POST['admin_id'] ?? 0);
    if ($delId > 0 && $delId !== $adminId) {
        $pdo->prepare("DELETE FROM admin_users WHERE admin_id = ?")->execute([$delId]);
        $message = 'Admin user deleted.';
        $msgType = 'success';
    } else {
        $message = 'Cannot delete your own account.';
        $msgType = 'danger';
    }
}

// 3) Change own password
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'change_password') {
    $curPass = $_POST['current_password'] ?? '';
    $newPass = $_POST['new_password'] ?? '';
    $confPass = $_POST['confirm_password'] ?? '';

    $aStmt = $pdo->prepare("SELECT password FROM admin_users WHERE admin_id = ?");
    $aStmt->execute([$adminId]);
    $hash = $aStmt->fetchColumn();

    if (!password_verify($curPass, $hash)) {
        $message = 'Current password is incorrect.';
        $msgType = 'danger';
    } elseif (strlen($newPass) < 6) {
        $message = 'New password must be at least 6 characters.';
        $msgType = 'danger';
    } elseif ($newPass !== $confPass) {
        $message = 'Passwords do not match.';
        $msgType = 'danger';
    } else {
        $pdo->prepare("UPDATE admin_users SET password = ? WHERE admin_id = ?")
            ->execute([password_hash($newPass, PASSWORD_DEFAULT), $adminId]);
        $message = 'Password changed successfully.';
        $msgType = 'success';
    }
}

// 4) Update SMTP settings
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update_smtp') {
    $smtpHost = trim($_POST['smtp_host'] ?? '');
    $smtpPort = (int)($_POST['smtp_port'] ?? 587);
    $smtpUser = trim($_POST['smtp_user'] ?? '');
    $smtpPass = trim($_POST['smtp_pass'] ?? '');
    $devMode  = isset($_POST['dev_mode']) ? 'true' : 'false';

    // Update mail_config.php
    $configPath = dirname(__DIR__) . '/config/mail_config.php';
    if (file_exists($configPath)) {
        $content = file_get_contents($configPath);
        $content = preg_replace("/define\('SMTP_HOST',\s*'[^']*'\)/", "define('SMTP_HOST', '{$smtpHost}')", $content);
        $content = preg_replace("/define\('SMTP_PORT',\s*\d+\)/", "define('SMTP_PORT', {$smtpPort})", $content);
        $content = preg_replace("/define\('SMTP_USER',\s*'[^']*'\)/", "define('SMTP_USER', '{$smtpUser}')", $content);
        $content = preg_replace("/define\('SMTP_PASS',\s*'[^']*'\)/", "define('SMTP_PASS', '{$smtpPass}')", $content);
        file_put_contents($configPath, $content);
    }

    // Update DEV_MODE in config.php
    $mainConfigPath = dirname(__DIR__) . '/config/config.php';
    if (file_exists($mainConfigPath)) {
        $mc = file_get_contents($mainConfigPath);
        $mc = preg_replace("/define\('DEV_MODE',\s*(true|false)\)/", "define('DEV_MODE', {$devMode})", $mc);
        file_put_contents($mainConfigPath, $mc);
    }

    $message = 'SMTP settings updated. Restart PHP server if needed.';
    $msgType  = 'success';
}

// Read current settings
$admins = $pdo->query("SELECT admin_id, username, full_name, email, role, last_login, created_at FROM admin_users ORDER BY admin_id")->fetchAll();

// Read current SMTP config
$currentSMTP = ['host' => '', 'port' => 587, 'user' => '', 'pass' => '', 'dev_mode' => true];
$mailCfgPath = dirname(__DIR__) . '/config/mail_config.php';
if (file_exists($mailCfgPath)) {
    $mc = file_get_contents($mailCfgPath);
    if (preg_match("/SMTP_HOST',\s*'([^']*)'/", $mc, $m)) $currentSMTP['host'] = $m[1];
    if (preg_match("/SMTP_PORT',\s*(\d+)/", $mc, $m))     $currentSMTP['port'] = (int)$m[1];
    if (preg_match("/SMTP_USER',\s*'([^']*)'/", $mc, $m))  $currentSMTP['user'] = $m[1];
    if (preg_match("/SMTP_PASS',\s*'([^']*)'/", $mc, $m))  $currentSMTP['pass'] = $m[1];
}
$mainCfgPath = dirname(__DIR__) . '/config/config.php';
if (file_exists($mainCfgPath)) {
    $mc = file_get_contents($mainCfgPath);
    if (preg_match("/DEV_MODE',\s*(true|false)/", $mc, $m)) $currentSMTP['dev_mode'] = ($m[1] === 'true');
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

        <?php if ($message): ?>
        <div class="alert alert-<?= $msgType ?> alert-dismissible fade show" role="alert">
            <?= sanitise($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
        <?php endif; ?>

        <div class="row g-4">

            <!-- Change Own Password -->
            <div class="col-lg-6">
                <div class="admin-card">
                    <div class="admin-card-header"><i class="fa-solid fa-key"></i> Change Password</div>
                    <div class="admin-card-body">
                        <form method="POST">
                            <input type="hidden" name="action" value="change_password">
                            <div class="mb-3">
                                <label class="form-label form-label-sm">Current Password</label>
                                <input type="password" name="current_password" class="form-control form-control-sm" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label form-label-sm">New Password</label>
                                <input type="password" name="new_password" class="form-control form-control-sm" minlength="6" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label form-label-sm">Confirm New Password</label>
                                <input type="password" name="confirm_password" class="form-control form-control-sm" required>
                            </div>
                            <button class="btn btn-primary btn-sm"><i class="fa-solid fa-check"></i> Update Password</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- SMTP / Email Settings -->
            <div class="col-lg-6">
                <div class="admin-card">
                    <div class="admin-card-header"><i class="fa-solid fa-envelope-open-text"></i> Email / SMTP Settings</div>
                    <div class="admin-card-body">
                        <form method="POST">
                            <input type="hidden" name="action" value="update_smtp">
                            <div class="row g-2">
                                <div class="col-8">
                                    <label class="form-label form-label-sm">SMTP Host</label>
                                    <input type="text" name="smtp_host" class="form-control form-control-sm"
                                           value="<?= sanitise($currentSMTP['host']) ?>">
                                </div>
                                <div class="col-4">
                                    <label class="form-label form-label-sm">Port</label>
                                    <input type="number" name="smtp_port" class="form-control form-control-sm"
                                           value="<?= $currentSMTP['port'] ?>">
                                </div>
                            </div>
                            <div class="mb-2 mt-2">
                                <label class="form-label form-label-sm">SMTP Username</label>
                                <input type="text" name="smtp_user" class="form-control form-control-sm"
                                       value="<?= sanitise($currentSMTP['user']) ?>">
                            </div>
                            <div class="mb-2">
                                <label class="form-label form-label-sm">SMTP Password / App Password</label>
                                <input type="password" name="smtp_pass" class="form-control form-control-sm"
                                       value="<?= sanitise($currentSMTP['pass']) ?>">
                                <div class="form-text">For Gmail: use a 16-char <a href="https://myaccount.google.com/apppasswords" target="_blank">App Password</a></div>
                            </div>
                            <div class="form-check mb-3">
                                <input type="checkbox" class="form-check-input" name="dev_mode" id="devMode"
                                       <?= $currentSMTP['dev_mode'] ? 'checked' : '' ?>>
                                <label class="form-check-label form-label-sm" for="devMode">
                                    DEV_MODE <small class="text-muted">(show OTP in response when email fails)</small>
                                </label>
                            </div>
                            <button class="btn btn-primary btn-sm"><i class="fa-solid fa-save"></i> Save SMTP Settings</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Admin Users -->
            <div class="col-12">
                <div class="admin-card">
                    <div class="admin-card-header"><i class="fa-solid fa-users-gear"></i> Admin Users</div>
                    <div class="admin-card-body p-0">
                        <div class="table-responsive">
                        <table class="table admin-table mb-0">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Last Login</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php foreach ($admins as $au): ?>
                                <tr>
                                    <td><?= $au['admin_id'] ?></td>
                                    <td class="fw-semibold"><?= sanitise($au['username']) ?></td>
                                    <td><?= sanitise($au['full_name']) ?></td>
                                    <td><?= sanitise($au['email'] ?? '—') ?></td>
                                    <td><span class="badge bg-<?= $au['role']==='superadmin' ? 'danger' : 'primary' ?>"><?= $au['role'] ?></span></td>
                                    <td><?= $au['last_login'] ? date('d M Y H:i', strtotime($au['last_login'])) : '—' ?></td>
                                    <td><?= date('d M Y', strtotime($au['created_at'])) ?></td>
                                    <td>
                                        <?php if ($au['admin_id'] !== $adminId): ?>
                                        <form method="POST" class="d-inline" onsubmit="return confirm('Delete this admin user?')">
                                            <input type="hidden" name="action" value="delete_admin">
                                            <input type="hidden" name="admin_id" value="<?= $au['admin_id'] ?>">
                                            <button class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                                        </form>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add New Admin -->
            <div class="col-lg-6">
                <div class="admin-card">
                    <div class="admin-card-header"><i class="fa-solid fa-user-plus"></i> Add Admin User</div>
                    <div class="admin-card-body">
                        <form method="POST">
                            <input type="hidden" name="action" value="add_admin">
                            <div class="mb-2">
                                <label class="form-label form-label-sm">Username <span class="text-danger">*</span></label>
                                <input type="text" name="username" class="form-control form-control-sm" required>
                            </div>
                            <div class="mb-2">
                                <label class="form-label form-label-sm">Password <span class="text-danger">*</span></label>
                                <input type="password" name="password" class="form-control form-control-sm" minlength="6" required>
                            </div>
                            <div class="mb-2">
                                <label class="form-label form-label-sm">Full Name <span class="text-danger">*</span></label>
                                <input type="text" name="full_name" class="form-control form-control-sm" required>
                            </div>
                            <div class="mb-2">
                                <label class="form-label form-label-sm">Email</label>
                                <input type="email" name="email" class="form-control form-control-sm">
                            </div>
                            <div class="mb-3">
                                <label class="form-label form-label-sm">Role</label>
                                <select name="role" class="form-select form-select-sm">
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                            </div>
                            <button class="btn btn-success btn-sm"><i class="fa-solid fa-plus"></i> Create Admin</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- System Info -->
            <div class="col-lg-6">
                <div class="admin-card">
                    <div class="admin-card-header"><i class="fa-solid fa-circle-info"></i> System Info</div>
                    <div class="admin-card-body">
                        <table class="table table-sm mb-0">
                            <tr><td class="text-muted">PHP Version</td><td class="fw-semibold"><?= phpversion() ?></td></tr>
                            <tr><td class="text-muted">MySQL Version</td><td class="fw-semibold"><?= $pdo->query("SELECT VERSION()")->fetchColumn() ?></td></tr>
                            <tr><td class="text-muted">Server Software</td><td class="fw-semibold"><?= sanitise($_SERVER['SERVER_SOFTWARE'] ?? 'CLI') ?></td></tr>
                            <tr><td class="text-muted">Document Root</td><td class="fw-semibold"><?= sanitise($_SERVER['DOCUMENT_ROOT'] ?? '—') ?></td></tr>
                            <tr><td class="text-muted">DEV_MODE</td><td class="fw-semibold"><?= defined('DEV_MODE') && DEV_MODE ? '<span class="text-warning">Enabled</span>' : '<span class="text-success">Disabled</span>' ?></td></tr>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/admin.js"></script>
</body>
</html>
