<?php
/**
 * ============================================================
 * Controller — Create Appointment
 * ============================================================
 *
 * Endpoint : POST /controllers/create_appointment.php
 * Accepts  : JSON body with patient + appointment fields
 * Returns  : JSON { status, message, appointment_id }
 *
 * Workflow:
 *   1. Verify OTP was confirmed (session check)
 *   2. Validate CSRF token
 *   3. Validate & sanitise all inputs
 *   4. Check for duplicate appointment (same patient, date, slot)
 *   5. Insert patient record
 *   6. Insert appointment record
 *   7. Return appointment_id for payment step
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';

/* ----------------------------------------------------------
 * 1. POST ONLY
 * ---------------------------------------------------------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['status' => 'error', 'message' => 'Method not allowed.'], 405);
}

/* ----------------------------------------------------------
 * 2. VERIFY OTP SESSION
 * ---------------------------------------------------------- */
if (empty($_SESSION['otp_verified']) || $_SESSION['otp_verified'] !== true) {
    jsonResponse(['status' => 'error', 'message' => 'Email not verified. Please verify OTP first.'], 403);
}

/* ----------------------------------------------------------
 * 3. READ & PARSE INPUT
 * ---------------------------------------------------------- */
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid request data.'], 400);
}

/* ----------------------------------------------------------
 * 4. VALIDATE CSRF TOKEN
 * ---------------------------------------------------------- */
$csrfToken = $input['csrf_token'] ?? '';
if (!validateCSRFToken($csrfToken)) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid or expired security token. Please reload the page.'], 403);
}

/* ----------------------------------------------------------
 * 5. EXTRACT & VALIDATE FIELDS
 * ---------------------------------------------------------- */
$requiredFields = [
    'full_name', 'mobile', 'email', 'gender', 'dob',
    'department', 'appointment_date', 'time_slot',
    'appointment_type', 'reason',
];

foreach ($requiredFields as $field) {
    if (empty(trim($input[$field] ?? ''))) {
        jsonResponse([
            'status'  => 'error',
            'message' => 'Missing required field: ' . str_replace('_', ' ', $field),
        ], 422);
    }
}

// Sanitise
$fullName        = sanitise($input['full_name']);
$mobile          = sanitise($input['mobile']);
$email           = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
$gender          = sanitise($input['gender']);
$dob             = sanitise($input['dob']);
$department      = sanitise($input['department']);
$doctor          = sanitise($input['doctor'] ?? 'Any Available');
$appointmentDate = sanitise($input['appointment_date']);
$timeSlot        = sanitise($input['time_slot']);
$appointmentType = sanitise($input['appointment_type']);
$reason          = sanitise($input['reason']);
$symptoms        = sanitise($input['symptoms'] ?? '');
$duration        = sanitise($input['duration'] ?? '');
$society         = sanitise($input['society'] ?? '');
$city            = sanitise($input['city'] ?? '');
$state           = sanitise($input['state'] ?? '');

// ---- Field-level validation ----

// Email must match verified email
if ($email !== ($_SESSION['otp_verified_email'] ?? '')) {
    jsonResponse(['status' => 'error', 'message' => 'Email does not match the verified email.'], 422);
}

// Email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid email format.'], 422);
}

// Mobile: 10-digit Indian number
if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid 10-digit mobile number.'], 422);
}

// Gender whitelist
if (!in_array($gender, ['Male', 'Female', 'Other'], true)) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid gender selection.'], 422);
}

// DOB — must not be in the future
$dobDate = DateTime::createFromFormat('Y-m-d', $dob);
if (!$dobDate || $dobDate > new DateTime()) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid date of birth.'], 422);
}

// Appointment date — must be today or future
$aptDate = DateTime::createFromFormat('Y-m-d', $appointmentDate);
$today   = new DateTime('today');
if (!$aptDate || $aptDate < $today) {
    jsonResponse(['status' => 'error', 'message' => 'Appointment date must be today or a future date.'], 422);
}

// Appointment type whitelist
if (!in_array($appointmentType, ['New', 'Follow-up'], true)) {
    jsonResponse(['status' => 'error', 'message' => 'Invalid appointment type.'], 422);
}

// Calculate age
$age = (int)(new DateTime())->diff($dobDate)->y;

/* ----------------------------------------------------------
 * 6. DUPLICATE APPOINTMENT CHECK
 * ---------------------------------------------------------- */
$pdo = getDBConnection();

$stmt = $pdo->prepare(
    'SELECT a.appointment_id
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
      WHERE p.email            = :email
        AND a.appointment_date = :apt_date
        AND a.time_slot        = :slot
        AND a.status          != "Cancelled"
      LIMIT 1'
);
$stmt->execute([
    ':email'    => $email,
    ':apt_date' => $appointmentDate,
    ':slot'     => $timeSlot,
]);

if ($stmt->fetch()) {
    jsonResponse([
        'status'  => 'error',
        'message' => 'You already have an appointment booked for this date and time slot.',
    ], 409);
}

/* ----------------------------------------------------------
 * 7. INSERT — USING TRANSACTION
 * ---------------------------------------------------------- */
try {
    $pdo->beginTransaction();

    // 7a. Insert patient (including address)
    $stmtPatient = $pdo->prepare(
        'INSERT INTO patients (full_name, mobile, email, gender, dob, age, society, city, state)
         VALUES (:name, :mobile, :email, :gender, :dob, :age, :society, :city, :state)'
    );
    $stmtPatient->execute([
        ':name'    => $fullName,
        ':mobile'  => $mobile,
        ':email'   => $email,
        ':gender'  => $gender,
        ':dob'     => $dob,
        ':age'     => $age,
        ':society' => $society ?: null,
        ':city'    => $city ?: null,
        ':state'   => $state ?: null,
    ]);
    $patientId = (int)$pdo->lastInsertId();

    // 7b. Insert appointment
    $stmtApt = $pdo->prepare(
        'INSERT INTO appointments
            (patient_id, department, doctor, appointment_date, time_slot,
             appointment_type, reason, symptoms, duration, status, payment_status)
         VALUES
            (:pid, :dept, :doc, :apt_date, :slot,
             :type, :reason, :symptoms, :dur, "Pending", "Unpaid")'
    );
    $stmtApt->execute([
        ':pid'      => $patientId,
        ':dept'     => $department,
        ':doc'      => $doctor,
        ':apt_date' => $appointmentDate,
        ':slot'     => $timeSlot,
        ':type'     => $appointmentType,
        ':reason'   => $reason,
        ':symptoms' => $symptoms,
        ':dur'      => $duration,
    ]);
    $appointmentId = (int)$pdo->lastInsertId();

    $pdo->commit();

} catch (\PDOException $e) {
    $pdo->rollBack();
    error_log('Appointment creation failed: ' . $e->getMessage());
    jsonResponse(['status' => 'error', 'message' => 'Failed to create appointment. Please try again.'], 500);
}

/* ----------------------------------------------------------
 * 8. STORE APPOINTMENT ID IN SESSION
 * ---------------------------------------------------------- */
$_SESSION['appointment_id'] = $appointmentId;
$_SESSION['patient_id']     = $patientId;
$_SESSION['patient_name']   = $fullName;
$_SESSION['patient_email']  = $email;

/* ----------------------------------------------------------
 * 9. SUCCESS RESPONSE
 * ---------------------------------------------------------- */
jsonResponse([
    'status'         => 'success',
    'message'        => 'Appointment created successfully.',
    'appointment_id' => $appointmentId,
    'patient_id'     => $patientId,
]);
