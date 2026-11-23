import type { ChatUIMessage } from "@/lib/chat-types";

/** A chat as shown in the sidebar list. */
export type ChatSummary = {
  /** The chat's UUID (URL segment). */
  chatId: string;
  /** Human-readable title, derived from the first user message. */
  title: string;
  /** ISO 8601 timestamp of the last activity, for most-recent-first ordering. */
  updatedAt: string;
};

/**
 * Persistence contract for studio chats. Callers depend on this interface only.
 * - Every method reads and writes only the chats of the current tenant and user.
 * - A `chatId` is unique per tenant and user; the same id under another user is another chat.
 * @throws from every method when called outside `runWithTenant` and `runWithUser`.
 */
export interface ChatRepository {
  /** Chats for a patient, most-recent-first. */
  listChats(patientId: string): Promise<ChatSummary[]>;
  /**
   * The persisted transcript for a chat, ready to seed `useChat`. Empty when the
   * chat belongs to another user or patient.
   */
  getMessages(patientId: string, chatId: string): Promise<ChatUIMessage[]>;
  /** Upserts a chat and replaces its message set with `messages`, in order. */
  saveChat(patientId: string, chatId: string, messages: ChatUIMessage[]): Promise<void>;
}
