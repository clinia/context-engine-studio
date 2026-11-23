CREATE TABLE "chats" (
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chats_tenant_id_user_id_chat_id_pk" PRIMARY KEY("tenant_id","user_id","chat_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"message_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "messages_tenant_id_user_id_chat_id_message_id_pk" PRIMARY KEY("tenant_id","user_id","chat_id","message_id"),
	CONSTRAINT "messages_chat_ordinal_unique" UNIQUE("tenant_id","user_id","chat_id","ordinal")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_fk" FOREIGN KEY ("tenant_id","user_id","chat_id") REFERENCES "public"."chats"("tenant_id","user_id","chat_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_owner_patient_updated_idx" ON "chats" USING btree ("tenant_id","user_id","patient_id","updated_at");