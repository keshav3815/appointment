<?php
/**
 * Admin Logout
 */
declare(strict_types=1);
require_once __DIR__ . '/../config/config.php';

// Clear only admin session keys
unset(
    $_SESSION['admin_id'],
    $_SESSION['admin_name'],
    $_SESSION['admin_username'],
    $_SESSION['admin_role'],
    $_SESSION['admin_logged_in']
);

header('Location: login.php');
exit;
