<?php
/**
 * Admin API — Get Appointment Detail
 */
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__) . '/auth_check.php';

header('Content-Type: application/json');

$appointmentId = (int)($_GET['id'] ?? 0);

if ($appointmentId <= 0) {
    jsonResponse(false, 'Invalid appointment ID');
}

try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare(
        "SELECT a.*, p.full_name, p.email, p.mobile, p.gender, p.age,
                p.society, p.city, p.state
           FROM appointments a
           JOIN patients p ON p.patient_id = a.patient_id
          WHERE a.appointment_id = ?"
    );
    $stmt->execute([$appointmentId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(false, 'Appointment not found');
    }

    echo json_encode(['success' => true, 'appointment' => $row]);
} catch (PDOException $e) {
    jsonResponse(false, 'Database error: ' . $e->getMessage());
}
