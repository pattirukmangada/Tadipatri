-- NKV Bombay Lemon Traders - Full Database Schema
-- Run this in phpMyAdmin or MySQL CLI

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Database: nkv_lemon
-- --------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `nkv_lemon` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `nkv_lemon`;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin user: admin / admin123
INSERT INTO `users` (`username`, `password`) VALUES
('Rukman', '$2y$10$/kivBhYRgN2H7kbj.i6ntO13mqyvR0tzAtZzWii.l0Rb1yEN391Wy');

-- --------------------------------------------------------
-- Table: bills
-- --------------------------------------------------------
CREATE TABLE `bills` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patti_name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `serial_number` int(11) NOT NULL,
  `total_bags` int(11) NOT NULL DEFAULT 0,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `commission` decimal(12,2) NOT NULL DEFAULT 0.00,
  `cooli` decimal(12,2) NOT NULL DEFAULT 0.00,
  `chariti` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transport` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `date_serial` (`date`, `serial_number`),
  KEY `idx_date` (`date`),
  KEY `idx_patti` (`patti_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: bill_items
-- --------------------------------------------------------
CREATE TABLE `bill_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bill_id` int(11) NOT NULL,
  `buyer_name` varchar(255) NOT NULL DEFAULT '',
  `item_name` varchar(255) NOT NULL DEFAULT 'Lemon',
  `bags` int(11) NOT NULL DEFAULT 0,
  `rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `bill_id` (`bill_id`),
  CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: contacts
-- --------------------------------------------------------
CREATE TABLE `contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: settings
-- --------------------------------------------------------
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL DEFAULT 'NKV — Bombay Lemon Traders',
  `phone` varchar(50) NOT NULL DEFAULT '9876543210',
  `address` text NOT NULL,
  `commission_rate` decimal(10,2) NOT NULL DEFAULT 100.00,
  `transport_per_bag` decimal(10,2) NOT NULL DEFAULT 10.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings
INSERT INTO `settings` (`company_name`, `phone`, `address`, `commission_rate`, `transport_per_bag`) VALUES
('NKV — Bombay Lemon Traders', '9876543210', 'Indian Petrol Pump Beside, Rayalacheruvu, Gooty Road, Anantapur Dt', 100.00, 10.00);

COMMIT;



==================================================================================================
FOr Profit & Loss Statement,
-- --------------------------------------------------------
-- Table: profit_loss
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS profit_loss (
  id              INT(11)        NOT NULL AUTO_INCREMENT,
  total_expense   DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  additional_amt  DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  advance_amount  DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  income          DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  net_result      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  status          ENUM('profit','loss') NOT NULL DEFAULT 'profit',
  note            VARCHAR(255)   DEFAULT NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Run this once on your MySQL database
CREATE TABLE IF NOT EXISTS ledger_entries (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    date        DATE           NOT NULL,
    description VARCHAR(255)   NOT NULL,
    type        ENUM('credit','debit') NOT NULL,
    amount      DECIMAL(12,2)  NOT NULL DEFAULT 0,
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



ALTER TABLE settings
  ADD COLUMN cooli_per_bag   DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER commission_rate,
  ADD COLUMN chariti_per_bag DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER cooli_per_bag;


ALTER TABLE ledger_entries ADD COLUMN agent VARCHAR(255) NOT NULL DEFAULT '' AFTER description;


ALTER TABLE bills
  ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 0 AFTER net_amount;

-- 2. Add party_name column to profit_loss table
ALTER TABLE profit_loss
  ADD COLUMN party_name VARCHAR(255) NOT NULL DEFAULT '' AFTER note;

ALTER TABLE bills
  ADD COLUMN is_printed TINYINT(1) NOT NULL DEFAULT 0 AFTER is_paid;


-- Step 1: Add new columns
ALTER TABLE buyer_payments
  ADD COLUMN entry_type ENUM('credit','debit') NOT NULL DEFAULT 'credit' AFTER date,
  ADD COLUMN amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER entry_type;

-- Step 2: Copy existing credit_amount data into new amount column
UPDATE buyer_payments SET amount = credit_amount WHERE 1;

-- Step 3: Verify it looks correct (optional check)
SELECT id, buyer_name, date, entry_type, amount, credit_amount FROM buyer_payments LIMIT 10;

-- Optional: remove old column after verifying data is correct
ALTER TABLE buyer_payments DROP COLUMN credit_amount;


<?php
$password = "admin123";

// Generate secure hash
$hash = password_hash($password, PASSWORD_BCRYPT);

echo $hash;
?>


DELETE bl1 FROM buyer_ledger bl1
INNER JOIN buyer_ledger bl2
ON bl1.buyer_name = bl2.buyer_name
AND bl1.date = bl2.date
AND bl1.ref_type = 'patti'
AND bl2.ref_type = 'patti'
AND bl1.id > bl2.id;


CREATE TABLE IF NOT EXISTS buyer_hamali (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    buyer_name  VARCHAR(255)  NOT NULL,
    hamali      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_buyer (buyer_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS buyer_hamali (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    buyer_name VARCHAR(255)  NOT NULL,
    hamali     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_buyer (buyer_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;