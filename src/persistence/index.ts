import type { ChatStore } from "./chat-store";
import { SqliteChatStore } from "./sqlite/chat-store";

export type { ChatStore, ChatSummary } from "./chat-store";

let chatStore: ChatStore | undefined;

/**
 * Returns the process-wide chat store. This is the single place that binds the
 * {@link ChatStore} contract to a concrete backend — swap `SqliteChatStore`
 * here for a Postgres or localStorage implementation and nothing else changes.
 */
export function getChatStore(): ChatStore {
  chatStore ??= new SqliteChatStore();
  return chatStore;
}
