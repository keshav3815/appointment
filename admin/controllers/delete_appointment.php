<?php
/**
 * Admin API — Delete Appointment
 */
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__) . '/auth_check.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed', 405);
}

$appointmentId = (int)($_POST['appointment_id'] ?? 0);

if ($appointmentId <= 0) {
    jsonResponse(false, 'Invalid appointment ID');
}

try {
    $pdo = getDBConnection();

    // Delete related payments first (FK)
    $pdo->prepare("DELETE FROM payments WHERE appointment_id = ?")->execute([$appointmentId]);

    // Delete appointment
    $stmt = $pdo->prepare("DELETE FROM appointments WHERE appointment_id = ?");
    $stmt->execute([$appointmentId]);

    if ($stmt->rowCount() > 0) {
        jsonResponse(true, 'Appointment deleted');
    } else {
        jsonResponse(false, 'Appointment not found');
    }
} catch (PDOException $e) {
    jsonResponse(false, 'Database error: ' . $e->getMessage());
}
