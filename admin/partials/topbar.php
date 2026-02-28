<!-- Admin Top Bar -->
<header class="admin-topbar">
    <button class="sidebar-toggle" id="sidebarToggle">
        <i class="fa-solid fa-bars"></i>
    </button>
    <div class="topbar-title">
        <?= $pageTitle ?? 'Dashboard' ?>
    </div>
    <div class="topbar-right">
        <span class="topbar-date">
            <i class="fa-regular fa-calendar"></i> <?= date('d M Y') ?>
        </span>
        <a href="../index.php" class="btn btn-outline-primary btn-sm" target="_blank" title="View booking page">
            <i class="fa-solid fa-external-link-alt"></i> View Site
        </a>
    </div>
</header>
