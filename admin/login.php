<?php
/**
 * Admin Login Page
 */
declare(strict_types=1);
require_once __DIR__ . '/../config/config.php';

// Already logged in?
if (!empty($_SESSION['admin_logged_in'])) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        $error = 'Please enter both username and password.';
    } else {
        $pdo  = getDBConnection();
        $stmt = $pdo->prepare(
            'SELECT admin_id, username, password, full_name, role, is_active
               FROM admin_users
              WHERE username = :u
              LIMIT 1'
        );
        $stmt->execute([':u' => $username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password'])) {
            if (!(int)$admin['is_active']) {
                $error = 'Your account has been deactivated. Contact super admin.';
            } else {
                // Set session
                session_regenerate_id(true);
                $_SESSION['admin_id']        = $admin['admin_id'];
                $_SESSION['admin_name']      = $admin['full_name'];
                $_SESSION['admin_username']  = $admin['username'];
                $_SESSION['admin_role']      = $admin['role'];
                $_SESSION['admin_logged_in'] = true;

                // Update last login
                $pdo->prepare('UPDATE admin_users SET last_login = NOW() WHERE admin_id = :id')
                    ->execute([':id' => $admin['admin_id']]);

                header('Location: index.php');
                exit;
            }
        } else {
            $error = 'Invalid username or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Login — <?= APP_NAME ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link href="assets/css/admin.css" rel="stylesheet">
</head>
<body class="login-body">

<div class="login-container">
    <div class="login-card">
        <div class="login-header">
            <div class="login-icon">
                <i class="fa-solid fa-user-shield"></i>
            </div>
            <h3>Admin Panel</h3>
            <p class="text-muted">Doctor Appointment Booking System</p>
        </div>

        <?php if ($error): ?>
        <div class="alert alert-danger alert-sm">
            <i class="fa-solid fa-circle-exclamation"></i> <?= sanitise($error) ?>
        </div>
        <?php endif; ?>

        <form method="POST" autocomplete="off">
            <div class="mb-3">
                <label class="form-label"><i class="fa-solid fa-user"></i> Username</label>
                <input type="text" name="username" class="form-control form-control-lg"
                       placeholder="Enter username" value="<?= sanitise($username ?? '') ?>" required autofocus>
            </div>
            <div class="mb-4">
                <label class="form-label"><i class="fa-solid fa-lock"></i> Password</label>
                <input type="password" name="password" class="form-control form-control-lg"
                       placeholder="Enter password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-lg w-100">
                <i class="fa-solid fa-right-to-bracket"></i> Sign In
            </button>
        </form>

        <div class="text-center mt-3">
            <small class="text-muted">Default: admin / admin123</small>
        </div>
    </div>
</div>

</body>
</html>
