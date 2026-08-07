import type { ChatUIMessage } from "@/lib/chat-types";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ============================================================
// Centralized SQLite schema for all studio-local stores.
//
// Every table backed by the shared SQLite database (see ./client.ts) is defined
// here so a single migration set and one connection serve every store. New
// stores add their tables to this file rather than opening their own database.
//
// Chat store (chats + messages) below.
// ============================================================

/**
 * One row per chat (= engine session). `sessionId` is the UUID minted client-side
 * and carried in the URL (`/patients/{patientId}/chat/{sessionId}`). Timestamps
 * are epoch milliseconds so ordering the sidebar is a plain numeric sort.
 */
export const chatsTable = sqliteTable("chats", {
  sessionId: text("session_id").primaryKey(),
  patientId: text("patient_id").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * One row per persisted message. `message` stores the verbatim AI SDK
 * `ChatUIMessage` (id, role, parts, metadata) as JSON, so reopening a chat
 * re-seeds `useChat` losslessly. `ordinal` preserves conversation order.
 *
 * No `createdAt`: {@link "@/persistence/sqlite/chat-store".SqliteChatStore.saveChat}
 * rewrites the whole transcript (delete-then-insert) on every save, so a
 * per-message timestamp would only ever hold the last-save time, identical
 * across the session — misleading rather than useful. `ordinal` carries order.
 */
export const messagesTable = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatsTable.sessionId, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    message: text("message", { mode: "json" }).notNull().$type<ChatUIMessage>(),
  },
  (table) => [index("messages_session_ordinal_idx").on(table.sessionId, table.ordinal)],
);
