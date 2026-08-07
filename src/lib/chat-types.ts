import type { UIMessage } from "ai";

/** Token usage for a single model step (one LLM request within a turn). */
export type ChatStepUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

/**
 * Per-message metadata streamed from the chat route. `steps` accumulates each
 * step's usage as the turn progresses (the i-th entry maps to the i-th
 * `step-start` part); the top-level totals are the turn's cumulative usage.
 * Absent until the first step finishes.
 */
export type ChatMessageMetadata = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  steps?: ChatStepUsage[];
};

/** The studio's chat message type: a UI message carrying token {@link ChatMessageMetadata}. */
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
