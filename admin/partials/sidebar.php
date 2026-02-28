<!-- Admin Sidebar -->
<aside class="admin-sidebar" id="adminSidebar">
    <div class="sidebar-brand">
        <i class="fa-solid fa-hospital"></i>
        <span>Admin Panel</span>
    </div>
    <nav class="sidebar-nav">
        <a href="index.php" class="nav-link <?= basename($_SERVER['PHP_SELF']) === 'index.php' ? 'active' : '' ?>">
            <i class="fa-solid fa-gauge-high"></i> <span>Dashboard</span>
        </a>
        <a href="appointments.php" class="nav-link <?= basename($_SERVER['PHP_SELF']) === 'appointments.php' ? 'active' : '' ?>">
            <i class="fa-solid fa-calendar-check"></i> <span>Appointments</span>
        </a>
        <a href="patients.php" class="nav-link <?= basename($_SERVER['PHP_SELF']) === 'patients.php' ? 'active' : '' ?>">
            <i class="fa-solid fa-users"></i> <span>Patients</span>
        </a>
        <a href="payments.php" class="nav-link <?= basename($_SERVER['PHP_SELF']) === 'payments.php' ? 'active' : '' ?>">
            <i class="fa-solid fa-indian-rupee-sign"></i> <span>Payments</span>
        </a>
        <?php if ($adminRole === 'superadmin'): ?>
        <div class="nav-divider"></div>
        <a href="settings.php" class="nav-link <?= basename($_SERVER['PHP_SELF']) === 'settings.php' ? 'active' : '' ?>">
            <i class="fa-solid fa-gear"></i> <span>Settings</span>
        </a>
        <?php endif; ?>
    </nav>
    <div class="sidebar-footer">
        <div class="admin-badge">
            <i class="fa-solid fa-circle-user"></i>
            <div>
                <div class="admin-badge-name"><?= sanitise($adminName) ?></div>
                <div class="admin-badge-role"><?= ucfirst(sanitise($adminRole)) ?></div>
            </div>
        </div>
        <a href="logout.php" class="btn btn-outline-danger btn-sm w-100 mt-2">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
        </a>
    </div>
</aside>
