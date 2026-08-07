import type { ChatUIMessage } from "@/lib/chat-types";
import type { ChatStore, ChatSummary } from "@/persistence/chat-store";
import { and, asc, desc, eq } from "drizzle-orm";
import { getSqliteDatabase } from "./client";
import { chatsTable, messagesTable } from "./schema";

const TITLE_MAX_LENGTH = 60;
const DEFAULT_TITLE = "New chat";

/** Flattens a UI message's text parts into a single trimmed string. */
function messageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

/** Derives a chat title from the first user message, truncated for the sidebar. */
function deriveTitle(messages: ChatUIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser ? messageText(firstUser) : "";
  if (!text) return DEFAULT_TITLE;
  return text.length > TITLE_MAX_LENGTH
    ? `${text.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : text;
}

/** SQLite-backed {@link ChatStore} over the shared studio database. */
export class SqliteChatStore implements ChatStore {
  async listChats(patientId: string): Promise<ChatSummary[]> {
    const rows = getSqliteDatabase()
      .select({
        sessionId: chatsTable.sessionId,
        title: chatsTable.title,
        updatedAt: chatsTable.updatedAt,
      })
      .from(chatsTable)
      .where(eq(chatsTable.patientId, patientId))
      .orderBy(desc(chatsTable.updatedAt))
      .all();

    return rows.map((row) => ({
      sessionId: row.sessionId,
      title: row.title,
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  async getMessages(patientId: string, sessionId: string): Promise<ChatUIMessage[]> {
    // Join to chats and filter on patientId so a sessionId owned by a different
    // patient resolves to no rows rather than leaking another patient's transcript.
    const rows = getSqliteDatabase()
      .select({ message: messagesTable.message })
      .from(messagesTable)
      .innerJoin(chatsTable, eq(messagesTable.sessionId, chatsTable.sessionId))
      .where(and(eq(chatsTable.patientId, patientId), eq(chatsTable.sessionId, sessionId)))
      .orderBy(asc(messagesTable.ordinal))
      .all();

    return rows.map((row) => row.message);
  }

  async saveChat(patientId: string, sessionId: string, messages: ChatUIMessage[]): Promise<void> {
    const now = Date.now();
    const db = getSqliteDatabase();

    db.transaction((tx) => {
      // Insert the chat on first save (title derived once); later saves only bump
      // updatedAt so the sidebar reorders without churning the title.
      tx.insert(chatsTable)
        .values({
          sessionId,
          patientId,
          title: deriveTitle(messages),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: chatsTable.sessionId,
          set: { updatedAt: now, patientId },
        })
        .run();

      // Replace the transcript wholesale: the client sends the full message list
      // each turn, so a delete-then-insert keeps ordinals contiguous and in sync.
      tx.delete(messagesTable).where(eq(messagesTable.sessionId, sessionId)).run();
      if (messages.length > 0) {
        tx.insert(messagesTable)
          .values(messages.map((message, ordinal) => ({ sessionId, ordinal, message })))
          .run();
      }
    });
  }
}
