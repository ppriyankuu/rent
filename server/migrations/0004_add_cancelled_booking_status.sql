-- Add 'cancelled' status to bookings table
-- Note: SQLite doesn't support modifying CHECK constraints directly,
-- so we need to recreate the table with the new enum values

-- Disable foreign key enforcement temporarily
PRAGMA foreign_keys=OFF;
--> statement-breakpoint

-- Create temporary table with new schema
CREATE TABLE `bookings_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`bed_id` integer NOT NULL,
	`status` text DEFAULT 'pending_deposit' NOT NULL,
	`monthly_rent` real NOT NULL,
	`move_in_date` text NOT NULL,
	`move_out_date` text,
	`next_rent_due_date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

-- Copy data from old table to new table
INSERT INTO `bookings_new` (`id`, `tenant_id`, `bed_id`, `status`, `monthly_rent`, `move_in_date`, `move_out_date`, `next_rent_due_date`, `created_at`)
SELECT `id`, `tenant_id`, `bed_id`, `status`, `monthly_rent`, `move_in_date`, `move_out_date`, `next_rent_due_date`, `created_at`
FROM `bookings`;
--> statement-breakpoint

-- Drop old table
DROP TABLE `bookings`;
--> statement-breakpoint

-- Rename new table to original name
ALTER TABLE `bookings_new` RENAME TO `bookings`;
--> statement-breakpoint

-- Recreate index
CREATE INDEX `idx_bookings_tenant_status` ON `bookings` (`tenant_id`, `status`);
--> statement-breakpoint

-- Re-enable foreign key enforcement
PRAGMA foreign_keys=ON;
