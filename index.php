<?php
/**
 * ============================================================
 * Frontend — Multi-Step Patient Appointment Booking Wizard
 * ============================================================
 *
 * Step 1 → Patient Details & Address (+ OTP verification)
 * Step 2 → Appointment Details
 * Step 3 → Reason for Visit
 * Step 4 → Payment & Confirmation
 */

declare(strict_types=1);

require_once __DIR__ . '/config/config.php';

$csrfToken = generateCSRFToken();
$fee       = CONSULTATION_FEE;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Book Appointment — <?= APP_NAME ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome 6 -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <!-- Custom -->
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>

<div class="container py-4 py-md-5">
<div class="row justify-content-center">
<div class="col-lg-9 col-xl-8">

<div class="card appointment-card shadow-lg">
<div class="card-body p-4 p-md-5">

    <!-- ============ Title ============ -->
    <h3 class="form-title text-center mb-2">
        <i class="fa-solid fa-calendar-check"></i> Book Your Appointment
    </h3>
    <p class="text-center text-muted mb-4" style="font-size:0.92rem;">
        Complete the steps below to schedule your visit
    </p>

    <!-- ============ Step Progress Bar ============ -->
    <div class="step-progress" id="stepProgress">
        <!-- Step 1 -->
        <div class="step-item active" data-step="1">
            <div class="step-circle">1</div>
            <div class="step-label">Patient &amp; Address</div>
        </div>
        <div class="step-connector" data-connector="1"></div>

        <!-- Step 2 -->
        <div class="step-item" data-step="2">
            <div class="step-circle">2</div>
            <div class="step-label">Appointment</div>
        </div>
        <div class="step-connector" data-connector="2"></div>

        <!-- Step 3 -->
        <div class="step-item" data-step="3">
            <div class="step-circle">3</div>
            <div class="step-label">Reason</div>
        </div>
        <div class="step-connector" data-connector="3"></div>

        <!-- Step 4 -->
        <div class="step-item" data-step="4">
            <div class="step-circle">4</div>
            <div class="step-label">Payment</div>
        </div>
    </div>

    <!-- ============ Global Alert ============ -->
    <div id="globalAlert" class="alert d-none" role="alert"></div>

    <!-- Hidden fields -->
    <input type="hidden" id="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
    <input type="hidden" id="consultation_fee" value="<?= $fee ?>">

    <form id="appointmentForm" novalidate>

    <!-- ================================================================
         STEP 1 — Patient Details & Address
         ================================================================ -->
    <div class="step-panel active" id="stepPanel1">

        <!-- Patient Details -->
        <div class="section-header">
            <i class="fa-solid fa-user-pen"></i> Patient Information
        </div>

        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label">Full Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-lg" id="full_name"
                       placeholder="e.g. Rajesh Kumar" required>
                <div class="invalid-feedback">Please enter your full name.</div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Mobile Number <span class="text-danger">*</span></label>
                <input type="tel" class="form-control form-control-lg" id="mobile"
                       maxlength="10" placeholder="10-digit number" required>
                <div class="invalid-feedback">Enter a valid 10-digit mobile number.</div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Email ID <span class="text-danger">*</span></label>
                <div class="input-group input-group-lg">
                    <input type="email" class="form-control" id="email"
                           placeholder="you@example.com" required>
                    <button type="button" class="btn btn-outline-primary" id="sendOtpBtn">
                        <i class="fa-solid fa-paper-plane"></i> Send OTP
                    </button>
                </div>
                <div class="invalid-feedback">Enter a valid email address.</div>
                <div id="emailVerifiedBadge" class="mt-2" style="display:none;">
                    <span class="verified-badge">
                        <i class="fa-solid fa-circle-check"></i> Email Verified
                    </span>
                </div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Gender <span class="text-danger">*</span></label><br>
                <div class="form-check form-check-inline mt-2">
                    <input class="form-check-input" type="radio" name="gender"
                           id="genderMale" value="Male" required>
                    <label class="form-check-label" for="genderMale">Male</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="gender"
                           id="genderFemale" value="Female">
                    <label class="form-check-label" for="genderFemale">Female</label>
                </div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Date of Birth <span class="text-danger">*</span></label>
                <input type="date" class="form-control form-control-lg" id="dob" required>
                <div class="invalid-feedback">Please select your date of birth.</div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Age</label>
                <input type="text" class="form-control form-control-lg" id="age" readonly
                       placeholder="Auto-calculated">
            </div>
        </div>

        <!-- OTP Box -->
        <div class="otp-box" id="otpBox">
            <label class="form-label"><i class="fa-solid fa-shield-halved"></i> Email OTP Verification</label>
            <div class="input-group input-group-lg">
                <input type="text" class="form-control" id="otpInput" maxlength="6"
                       placeholder="Enter 6-digit OTP">
                <button type="button" class="btn btn-success" id="verifyOtpBtn">
                    <i class="fa-solid fa-circle-check"></i> Verify
                </button>
            </div>
            <small class="text-muted mt-1 d-block">OTP is valid for 5 minutes</small>
            <div id="otpMsg" class="mt-2"></div>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Address -->
        <div class="section-header">
            <i class="fa-solid fa-location-dot"></i> Address Details
        </div>

        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label">Society / Sector Name</label>
                <input type="text" class="form-control form-control-lg" id="society"
                       placeholder="Optional">
            </div>

            <div class="col-md-3">
                <label class="form-label">City <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-lg" id="city"
                       placeholder="City" required>
                <div class="invalid-feedback">City is required.</div>
            </div>

            <div class="col-md-3">
                <label class="form-label">State <span class="text-danger">*</span></label>
                <select class="form-select form-select-lg" id="state" required>
                    <option value="">Select</option>
                    <option>Andhra Pradesh</option>
                    <option>Bihar</option>
                    <option>Delhi</option>
                    <option>Gujarat</option>
                    <option>Haryana</option>
                    <option>Karnataka</option>
                    <option>Kerala</option>
                    <option>Madhya Pradesh</option>
                    <option>Maharashtra</option>
                    <option>Punjab</option>
                    <option>Rajasthan</option>
                    <option>Tamil Nadu</option>
                    <option>Uttar Pradesh</option>
                    <option>West Bengal</option>
                </select>
                <div class="invalid-feedback">Select a state.</div>
            </div>
        </div>

        <!-- Step 1 Nav -->
        <div class="step-nav">
            <div></div>
            <button type="button" class="btn btn-primary btn-step" id="nextToStep2">
                Next: Appointment <i class="fa-solid fa-arrow-right ms-1"></i>
            </button>
        </div>
    </div>

    <!-- ================================================================
         STEP 2 — Appointment Details
         ================================================================ -->
    <div class="step-panel" id="stepPanel2">

        <div class="section-header">
            <i class="fa-solid fa-hospital"></i> Appointment Details
        </div>

        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label">Department <span class="text-danger">*</span></label>
                <select class="form-select form-select-lg" id="department" required>
                    <option value="">Select Department</option>
                    <option>General Medicine</option>
                    <option>Orthopaedics</option>
                    <option>Cardiology</option>
                    <option>Dermatology</option>
                    <option>ENT</option>
                    <option>Gynaecology</option>
                    <option>Neurology</option>
                    <option>Paediatrics</option>
                    <option>Ophthalmology</option>
                    <option>Psychiatry</option>
                </select>
                <div class="invalid-feedback">Please select a department.</div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Preferred Doctor</label>
                <select class="form-select form-select-lg" id="doctor">
                    <option value="">Any Available</option>
                </select>
            </div>

            <div class="col-md-6">
                <label class="form-label">Appointment Date <span class="text-danger">*</span></label>
                <input type="date" class="form-control form-control-lg" id="appointment_date" required>
                <div class="invalid-feedback">Choose a future date.</div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Time Slot <span class="text-danger">*</span></label>
                <select class="form-select form-select-lg" id="time_slot" required>
                    <option value="">Select Slot</option>
                    <option>09:00 – 10:00</option>
                    <option>10:00 – 11:00</option>
                    <option>11:00 – 12:00</option>
                    <option>12:00 – 13:00</option>
                    <option>14:00 – 15:00</option>
                    <option>15:00 – 16:00</option>
                    <option>16:00 – 17:00</option>
                </select>
                <div class="invalid-feedback">Select a time slot.</div>
            </div>

            <div class="col-md-6">
                <label class="form-label">Appointment Type <span class="text-danger">*</span></label><br>
                <div class="form-check form-check-inline mt-2">
                    <input class="form-check-input" type="radio" name="appointment_type"
                           id="typeNew" value="New" required>
                    <label class="form-check-label" for="typeNew">New Visit</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="appointment_type"
                           id="typeFollowup" value="Follow-up">
                    <label class="form-check-label" for="typeFollowup">Follow-up</label>
                </div>
            </div>
        </div>

        <!-- Step 2 Nav -->
        <div class="step-nav">
            <button type="button" class="btn btn-outline-secondary btn-step" id="backToStep1">
                <i class="fa-solid fa-arrow-left me-1"></i> Back
            </button>
            <button type="button" class="btn btn-primary btn-step" id="nextToStep3">
                Next: Reason <i class="fa-solid fa-arrow-right ms-1"></i>
            </button>
        </div>
    </div>

    <!-- ================================================================
         STEP 3 — Reason for Visit
         ================================================================ -->
    <div class="step-panel" id="stepPanel3">

        <div class="section-header">
            <i class="fa-solid fa-notes-medical"></i> Reason for Visit
        </div>

        <div class="row g-3">
            <div class="col-12">
                <label class="form-label">Reason <span class="text-danger">*</span></label>
                <select class="form-select form-select-lg" id="reason" required>
                    <option value="">Select Reason</option>
                    <option>Fever</option>
                    <option>Pain</option>
                    <option>Routine Check-up</option>
                    <option>Follow-up Visit</option>
                    <option>Vaccination</option>
                    <option>Lab Test</option>
                    <option>Other</option>
                </select>
                <div class="invalid-feedback">Please select a reason.</div>
            </div>

            <div class="col-12">
                <label class="form-label">Symptoms <small class="text-muted">(Optional)</small></label>
                <textarea class="form-control form-control-lg" id="symptoms" rows="3"
                          placeholder="Describe your symptoms in brief…"></textarea>
            </div>

            <div class="col-md-6">
                <label class="form-label">Duration <small class="text-muted">(Optional)</small></label>
                <select class="form-select form-select-lg" id="duration">
                    <option value="">Select Duration</option>
                    <option>Today</option>
                    <option>1–3 days</option>
                    <option>1 week</option>
                    <option>2–4 weeks</option>
                    <option>More than 1 month</option>
                </select>
            </div>
        </div>

        <!-- Step 3 Nav -->
        <div class="step-nav">
            <button type="button" class="btn btn-outline-secondary btn-step" id="backToStep2">
                <i class="fa-solid fa-arrow-left me-1"></i> Back
            </button>
            <button type="button" class="btn btn-primary btn-step" id="nextToStep4">
                Next: Payment <i class="fa-solid fa-arrow-right ms-1"></i>
            </button>
        </div>
    </div>

    <!-- ================================================================
         STEP 4 — Review & Payment
         ================================================================ -->
    <div class="step-panel" id="stepPanel4">

        <div class="section-header">
            <i class="fa-solid fa-credit-card"></i> Review & Pay
        </div>

        <!-- Summary card (populated by JS) -->
        <div class="payment-summary mb-4" id="paymentSummary">
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-user"></i> Patient</span>
                <span class="summary-value" id="sumName">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-envelope"></i> Email</span>
                <span class="summary-value" id="sumEmail">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-phone"></i> Mobile</span>
                <span class="summary-value" id="sumMobile">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-hospital"></i> Department</span>
                <span class="summary-value" id="sumDept">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-user-doctor"></i> Doctor</span>
                <span class="summary-value" id="sumDoctor">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-calendar"></i> Date</span>
                <span class="summary-value" id="sumDate">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-clock"></i> Slot</span>
                <span class="summary-value" id="sumSlot">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-stethoscope"></i> Type</span>
                <span class="summary-value" id="sumType">—</span>
            </div>
            <div class="summary-row">
                <span class="summary-label"><i class="fa-solid fa-notes-medical"></i> Reason</span>
                <span class="summary-value" id="sumReason">—</span>
            </div>
        </div>

        <!-- Fee -->
        <div class="text-center mb-3">
            <p class="text-muted mb-1" style="font-size:0.9rem;">Consultation Fee</p>
            <div class="payment-amount">₹<?= number_format($fee, 2) ?></div>
        </div>

        <!-- Security note -->
        <div class="security-note mb-4">
            <i class="fa-solid fa-shield-halved"></i>
            <span>Payment secured by Razorpay. Your card details are never stored on our servers.</span>
        </div>

        <!-- Step 4 Nav -->
        <div class="step-nav">
            <button type="button" class="btn btn-outline-secondary btn-step" id="backToStep3">
                <i class="fa-solid fa-arrow-left me-1"></i> Back
            </button>
            <button type="button" class="btn btn-success btn-step" id="payNowBtn" style="min-width:200px;">
                <i class="fa-solid fa-lock"></i> Pay ₹<?= number_format($fee, 2) ?>
            </button>
        </div>
    </div>

    </form>

</div><!-- card-body -->
</div><!-- card -->

</div>
</div>
</div>

<!-- Bootstrap 5 JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<!-- Razorpay SDK -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<!-- App JS -->
<script src="assets/js/app.js"></script>

</body>
</html>
