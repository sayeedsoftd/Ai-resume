-- =====================================================================
-- AI Resume Analyzer and Job Match System
-- Raw MySQL Migration DDL Schema (MySQL 8.0+)
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `ai_resume_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ai_resume_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table: users
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `hashed_password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `role` ENUM('NORMAL_USER', 'SUBSCRIBER', 'SUPER_ADMIN') NOT NULL DEFAULT 'NORMAL_USER',
  `is_verified_badge` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: kyc_verifications
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `kyc_verifications`;
CREATE TABLE `kyc_verifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `real_name` VARCHAR(150) NOT NULL,
  `phone_number` VARCHAR(50) NOT NULL,
  `nid_doc_path` VARCHAR(500) NOT NULL,
  `selfie_path` VARCHAR(500) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` TEXT DEFAULT NULL,
  `reviewed_by` INT DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_kyc_user_id` (`user_id`),
  INDEX `idx_kyc_status` (`status`),
  INDEX `idx_kyc_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_kyc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kyc_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: user_profiles
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `user_profiles`;
CREATE TABLE `user_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `headline` VARCHAR(255) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `photo_url` VARCHAR(500) DEFAULT NULL,
  `contact_info` JSON DEFAULT NULL,
  `experience` JSON DEFAULT NULL,
  `education` JSON DEFAULT NULL,
  `certifications` JSON DEFAULT NULL,
  `skills` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: resumes
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `resumes`;
CREATE TABLE `resumes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `extracted_text` LONGTEXT DEFAULT NULL,
  `parsed_data` JSON DEFAULT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `is_primary` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_resumes_user_id` (`user_id`),
  INDEX `idx_resumes_primary` (`is_primary`),
  CONSTRAINT `fk_resumes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: jobs
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `posted_by_user_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `company_name` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `required_skills` JSON NOT NULL,
  `experience_level` ENUM('ENTRY', 'MID', 'SENIOR', 'LEAD') NOT NULL DEFAULT 'MID',
  `location` VARCHAR(200) NOT NULL,
  `job_type` ENUM('FULL_TIME', 'PART_TIME', 'REMOTE', 'CONTRACT', 'HYBRID') NOT NULL DEFAULT 'FULL_TIME',
  `salary_range` VARCHAR(100) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_jobs_posted_by` (`posted_by_user_id`),
  INDEX `idx_jobs_title` (`title`),
  INDEX `idx_jobs_is_active` (`is_active`),
  INDEX `idx_jobs_location` (`location`),
  CONSTRAINT `fk_jobs_poster` FOREIGN KEY (`posted_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: job_applications
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `job_applications`;
CREATE TABLE `job_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `resume_id` INT NOT NULL,
  `status` ENUM('APPLIED', 'SCREENING', 'INTERVIEW', 'REJECTED', 'ACCEPTED') NOT NULL DEFAULT 'APPLIED',
  `match_score` FLOAT DEFAULT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_job_application` (`job_id`, `user_id`),
  INDEX `idx_applications_job` (`job_id`),
  INDEX `idx_applications_user` (`user_id`),
  INDEX `idx_applications_status` (`status`),
  CONSTRAINT `fk_apps_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apps_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apps_resume` FOREIGN KEY (`resume_id`) REFERENCES `resumes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: notifications
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('SYSTEM', 'KYC', 'JOB', 'BROADCAST') NOT NULL DEFAULT 'SYSTEM',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notifications_user` (`user_id`),
  INDEX `idx_notifications_type` (`type`),
  INDEX `idx_notifications_read` (`is_read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
