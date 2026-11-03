import type { UIMessage } from "ai";

/**
 * Billed token usage for a single model step (one LLM request within a turn).
 * Each bucket is priced differently, so they are kept apart; summing a bucket
 * across steps gives what the chat was billed for it.
 * - `inputTokens`: input read without the prompt cache.
 * - `cacheReadTokens` / `cacheWriteTokens`: input read from / written to the prompt cache.
 */
export type ChatStepUsage = {
  inputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
};

/**
 * Per-message metadata streamed from the chat route. `steps` accumulates each
 * step's usage as the turn progresses (the i-th entry maps to the i-th
 * `step-start` part). Absent until the first step finishes.
 */
export type ChatMessageMetadata = {
  steps?: ChatStepUsage[];
};

/** The studio's chat message type: a UI message carrying token {@link ChatMessageMetadata}. */
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
