import type { ChatUIMessage } from "@/lib/chat-types";
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Every studio-local table lives in this file, so one migration set and one
// connection (see ./client.ts) serve every store.

/**
 * One row per chat, owned by one user in one tenant.
 * - `chatId` is the engine session id, a UUID minted client-side and carried in the
 *   URL (`/patients/{patientId}/chat/{chatId}`); unique per owner, not globally.
 * - `userId` is the token `sub`, with no foreign key: the studio keeps no user table.
 */
export const chatsTable = pgTable(
  "chats",
  {
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    chatId: text("chat_id").notNull(),
    patientId: text("patient_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.userId, table.chatId] }),
    index("chats_owner_patient_updated_idx").on(
      table.tenantId,
      table.userId,
      table.patientId,
      table.updatedAt,
    ),
  ],
);

/**
 * One row per persisted message, in conversation order by `ordinal`.
 * - `messageId` is the AI SDK message `id`, unique within a chat.
 * - `data` holds the whole AI SDK `ChatUIMessage` (id, role, parts, metadata), so
 *   reopening a chat re-seeds `useChat`. Object key order is not preserved.
 * - No per-message timestamp: every save rewrites the whole transcript.
 */
export const messagesTable = pgTable(
  "messages",
  {
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    chatId: text("chat_id").notNull(),
    messageId: text("message_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    data: jsonb("data").$type<ChatUIMessage>().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.tenantId, table.userId, table.chatId, table.messageId],
    }),
    unique("messages_chat_ordinal_unique").on(
      table.tenantId,
      table.userId,
      table.chatId,
      table.ordinal,
    ),
    foreignKey({
      name: "messages_chat_fk",
      columns: [table.tenantId, table.userId, table.chatId],
      foreignColumns: [chatsTable.tenantId, chatsTable.userId, chatsTable.chatId],
    }).onDelete("cascade"),
  ],
);
