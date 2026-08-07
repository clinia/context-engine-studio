import type { ChatUIMessage } from "@/lib/chat-types";

/** A chat as shown in the sidebar list. */
export type ChatSummary = {
  /** The chat/session UUID (URL segment). */
  sessionId: string;
  /** Human-readable title, derived from the first user message. */
  title: string;
  /** ISO 8601 timestamp of the last activity, for most-recent-first ordering. */
  updatedAt: string;
};

/**
 * Persistence contract for studio chats. The SQLite implementation
 * ({@link "@/persistence/sqlite/chat-store".SqliteChatStore}) backs it today; a
 * Postgres or browser-localStorage implementation can be dropped in behind this
 * interface without touching callers (see {@link "@/persistence".getChatStore}).
 */
export interface ChatStore {
  /** Chats for a patient, most-recent-first. */
  listChats(patientId: string): Promise<ChatSummary[]>;
  /**
   * The persisted transcript for a chat, ready to seed `useChat`. Scoped to
   * `patientId` so a session belonging to another patient never resolves.
   */
  getMessages(patientId: string, sessionId: string): Promise<ChatUIMessage[]>;
  /** Upserts a chat and replaces its message set with `messages`, in order. */
  saveChat(patientId: string, sessionId: string, messages: ChatUIMessage[]): Promise<void>;
}
