-- Migration: 001_add_chariti_and_buyer_name.sql
-- Run this ONLY if upgrading an existing database that doesn't have these columns

ALTER TABLE bills 
    ADD COLUMN IF NOT EXISTS chariti DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cooli;

ALTER TABLE bill_items 
    ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255) NOT NULL DEFAULT '' AFTER bill_id;

ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS transport_per_bag DECIMAL(10,2) NOT NULL DEFAULT 10.00 AFTER commission_rate;
