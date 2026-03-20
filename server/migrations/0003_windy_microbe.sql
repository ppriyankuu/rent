CREATE TABLE `deposit_deductions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deposit_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`booking_id` integer NOT NULL,
	`amount` real NOT NULL,
	`reason` text NOT NULL,
	`deducted_by` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`deposit_id`) REFERENCES `deposits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deducted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_deposit_deductions_tenant_id` ON `deposit_deductions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_deposit_deductions_deposit_id` ON `deposit_deductions` (`deposit_id`);--> statement-breakpoint
CREATE INDEX `idx_deposit_deductions_booking_id` ON `deposit_deductions` (`booking_id`);