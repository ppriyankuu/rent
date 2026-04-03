-- Add UPI verification columns to payments table
ALTER TABLE `payments` ADD `utr` text;
ALTER TABLE `payments` ADD `verification_status` text;
ALTER TABLE `payments` ADD `utr_submitted_at` text;
ALTER TABLE `payments` ADD `verified_by` integer REFERENCES `users`(`id`);
ALTER TABLE `payments` ADD `verified_at` text;
ALTER TABLE `payments` ADD `rejection_reason` text;

-- Create index for pending verification lookups
CREATE INDEX `idx_payments_verification_status` ON `payments` (`verification_status`);
