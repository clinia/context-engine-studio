CREATE TABLE `chats` (
	`session_id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`message` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chats`(`session_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_session_ordinal_idx` ON `messages` (`session_id`,`ordinal`);