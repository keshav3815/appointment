<?php
/**
 * Payment page is now embedded in the main wizard (Step 4).
 * Redirect to index if someone hits this URL directly.
 */
header('Location: ../index.php');
exit;
