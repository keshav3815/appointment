-- ============================================================
-- Doctor Appointment Booking System — Database Schema
-- Engine  : InnoDB (transactional, FK support)
-- Charset : utf8mb4
--
-- INSTRUCTIONS FOR CPANEL / SHARED HOSTING:
--   1. Go to cPanel → MySQL Databases
--   2. Create a new database (e.g. youruser_appointment)
--   3. Create a MySQL user and assign it to the database (ALL PRIVILEGES)
--   4. Go to phpMyAdmin, select that database
--   5. Click "Import" tab → upload this file
--   6. Update config/config.php with your DB_NAME, DB_USER, DB_PASS
--
-- The CREATE DATABASE / USE lines below are commented out for
-- cPanel compatibility. Uncomment them for local development.
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS `appointment_system`
--     CHARACTER SET utf8mb4
--     COLLATE utf8mb4_unicode_ci;
-- USE `appointment_system`;

-- ------------------------------------------------------------
-- 1. patients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patients` (
    `patient_id`   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `full_name`    VARCHAR(120)    NOT NULL,
    `mobile`       VARCHAR(15)     NOT NULL,
    `email`        VARCHAR(150)    NOT NULL,
    `gender`       ENUM('Male','Female','Other') NOT NULL,
    `dob`          DATE            NOT NULL,
    `age`          TINYINT UNSIGNED NOT NULL,
    `society`      VARCHAR(200)    DEFAULT NULL,
    `city`         VARCHAR(100)    DEFAULT NULL,
    `state`        VARCHAR(100)    DEFAULT NULL,
    `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`patient_id`),
    INDEX `idx_email` (`email`),
    INDEX `idx_mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. appointments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
    `appointment_id`   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `patient_id`       INT UNSIGNED    NOT NULL,
    `department`       VARCHAR(100)    NOT NULL,
    `doctor`           VARCHAR(120)    DEFAULT NULL,
    `appointment_date` DATE            NOT NULL,
    `time_slot`        VARCHAR(30)     NOT NULL,
    `appointment_type` ENUM('New','Follow-up') NOT NULL DEFAULT 'New',
    `reason`           VARCHAR(255)    NOT NULL,
    `symptoms`         TEXT            DEFAULT NULL,
    `duration`         VARCHAR(50)     DEFAULT NULL,
    `status`           ENUM('Pending','Confirmed','Cancelled','Completed')
                           NOT NULL DEFAULT 'Pending',
    `payment_status`   ENUM('Unpaid','Paid','Failed','Refunded')
                           NOT NULL DEFAULT 'Unpaid',
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`appointment_id`),
    CONSTRAINT `fk_appointments_patient`
        FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_date_slot` (`appointment_date`, `time_slot`),
    INDEX `idx_status` (`status`),
    INDEX `idx_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
    `payment_id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `appointment_id`   INT UNSIGNED    NOT NULL,
    `razorpay_order_id` VARCHAR(100)   DEFAULT NULL,
    `amount`           DECIMAL(10,2)   NOT NULL,
    `currency`         CHAR(3)         NOT NULL DEFAULT 'INR',
    `payment_gateway`  VARCHAR(30)     NOT NULL DEFAULT 'Razorpay',
    `payment_status`   ENUM('Created','Authorized','Captured','Failed','Refunded')
                           NOT NULL DEFAULT 'Created',
    `transaction_id`   VARCHAR(100)    DEFAULT NULL,
    `razorpay_signature` VARCHAR(255)  DEFAULT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`payment_id`),
    CONSTRAINT `fk_payments_appointment`
        FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`appointment_id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE INDEX `idx_order` (`razorpay_order_id`),
    INDEX `idx_transaction` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. otp_verification
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_verification` (
    `otp_id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `email`        VARCHAR(150)    NOT NULL,
    `otp_code`     VARCHAR(10)     NOT NULL,
    `expiry_time`  DATETIME        NOT NULL,
    `is_verified`  TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`otp_id`),
    INDEX `idx_email_otp` (`email`, `otp_code`),
    INDEX `idx_expiry` (`expiry_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. csrf_tokens  (CSRF protection)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `csrf_tokens` (
    `token_id`    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    `token`       VARCHAR(128)   NOT NULL,
    `created_at`  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at`  DATETIME       NOT NULL,
    PRIMARY KEY (`token_id`),
    UNIQUE INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
