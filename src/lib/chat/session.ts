import type { IngestSessionsMessage } from "@clinia/context-engine-js";
import type { UIMessage } from "ai";

/**
 * The chat's user and assistant turns as the Context Engine imports them: each message's text
 * parts joined, tool and reasoning parts dropped, and turns with no text left out.
 */
export function toSession(messages: readonly UIMessage[]): IngestSessionsMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const content = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    return content ? [{ role: message.role, content }] : [];
  });
}
