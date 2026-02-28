<?php
/**
 * Admin Auth Guard — include at top of every admin page.
 * Redirects to login if not authenticated.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

// Make admin info available
$adminId   = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin';
$adminRole = $_SESSION['admin_role'] ?? 'admin';
