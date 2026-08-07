/**
 * Lightweight client-side signal that the chat list changed (a chat was saved
 * or updated). The chat panel emits it after persisting a turn; the sidebar
 * subscribes and refetches, so a new chat appears right after its first message
 * without a reload. A window CustomEvent keeps the two components decoupled —
 * they live in separate subtrees under the patient layout.
 */
const CHATS_CHANGED_EVENT = "studio:chats-changed";

export function emitChatsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHATS_CHANGED_EVENT));
}

/** Subscribes to chat-list changes; returns an unsubscribe function. */
export function onChatsChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHATS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(CHATS_CHANGED_EVENT, handler);
}
