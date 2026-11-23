"use server";

import { defineAction } from "@/core/request-scope";
import type { ChatUIMessage } from "@/lib/chat-types";
import { err, errorMessage, ok, type Result } from "@/lib/result";
import type { ChatSummary } from "@/persistence";

/** Lists the current user's chats with a patient for the sidebar, most-recent-first. */
export const listChats = defineAction(
  async (driver, patientId: string): Promise<Result<ChatSummary[]>> => {
    try {
      return ok(await driver.getRepositories().chats.listChats(patientId));
    } catch (error) {
      return err(errorMessage(error));
    }
  },
);

/**
 * Loads the persisted transcript for a chat, ready to seed the
 * chat UI's initial messages. Reads from the studio-local chat database; the
 * verbatim `ChatUIMessage` rows round-trip with no conversion.
 */
export const loadChatMessages = defineAction(
  async (driver, patientId: string, chatId: string): Promise<Result<ChatUIMessage[]>> => {
    try {
      return ok(await driver.getRepositories().chats.getMessages(patientId, chatId));
    } catch (error) {
      return err(errorMessage(error));
    }
  },
);

/**
 * Persists a chat's full message list. Called after each completed turn with the
 * final `useChat` messages, so the sidebar and reopen reflect the latest state.
 */
export const saveChat = defineAction(
  async (
    driver,
    patientId: string,
    chatId: string,
    messages: ChatUIMessage[],
  ): Promise<Result<true>> => {
    try {
      await driver.getRepositories().chats.saveChat(patientId, chatId, messages);
      return ok(true);
    } catch (error) {
      return err(errorMessage(error));
    }
  },
);
