"use server";

import type { ChatUIMessage } from "@/lib/chat-types";
import { err, errorMessage, ok, type Result } from "@/lib/result";
import { getChatStore, type ChatSummary } from "@/persistence";

/** Lists a patient's chats for the sidebar, most-recent-first. */
export async function listChats(patientId: string): Promise<Result<ChatSummary[]>> {
  try {
    return ok(await getChatStore().listChats(patientId));
  } catch (error) {
    return err(errorMessage(error));
  }
}

/**
 * Loads the persisted transcript for a chat (= engine session), ready to seed the
 * chat UI's initial messages. Reads from the studio-local chat store; the
 * verbatim `ChatUIMessage` rows round-trip with no conversion.
 */
export async function loadSessionMessages(
  patientId: string,
  sessionId: string,
): Promise<Result<ChatUIMessage[]>> {
  try {
    return ok(await getChatStore().getMessages(patientId, sessionId));
  } catch (error) {
    return err(errorMessage(error));
  }
}

/**
 * Persists a chat's full message list. Called after each completed turn with the
 * final `useChat` messages, so the sidebar and reopen reflect the latest state.
 */
export async function saveChat(
  patientId: string,
  sessionId: string,
  messages: ChatUIMessage[],
): Promise<Result<true>> {
  try {
    await getChatStore().saveChat(patientId, sessionId, messages);
    return ok(true);
  } catch (error) {
    return err(errorMessage(error));
  }
}
