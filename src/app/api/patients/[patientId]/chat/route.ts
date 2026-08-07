import type { ChatMessageMetadata, ChatUIMessage } from "@/lib/chat-types";
import { appendMessages, upsertSession } from "@/lib/context-engine-client/actions";
import {
  openContextEngineMcp,
  type ContextEngineMcpSession,
  type ContextEngineMcpTools,
} from "@/lib/context-engine-client/mcp";
import { attempt } from "@/lib/result";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

/** Flattens a UI message's text parts into a single string (ignores tool/reasoning parts). */
function uiMessageText(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

/** Long-running tool loops can take a while; give the handler generous headroom. */
export const maxDuration = 120;

const anthropic = createAnthropic();

const FALLBACK_SYSTEM_PROMPT =
  "You are a clinical AI assistant. Answer questions about the patient using the " +
  "Virtual File System tools available to you. Cite the files you read.";

/**
 * Patient-scoped chat endpoint: `POST /api/patients/{patientId}/chat`.
 *
 * `patientId` comes from the route; the body carries the AI SDK `messages` and
 * the `sessionId` (the chat id, which will map to an engine session). It opens an
 * ephemeral engine MCP connection for the request, streams a tool-using Claude
 * response, and closes the MCP connection once the model is done.
 */
export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId: rawPatientId } = await params;
  const patientId = decodeURIComponent(rawPatientId);
  const { messages, sessionId } = (await req.json()) as {
    messages: UIMessage[];
    sessionId?: string;
  };

  // Open (idempotently) the engine session before any tool call, so the server has
  // a row to record this chat's transcript against, then persist the new user
  // message. Best-effort via `attempt`: like the MCP connection below, a failure
  // here shouldn't block the chat — it just won't be persisted.
  if (sessionId) {
    await attempt(upsertSession(patientId, sessionId));
    const userText = uiMessageText(messages.at(-1));
    if (userText) {
      await attempt(appendMessages(patientId, sessionId, [{ role: "user", content: userText }]));
    }
  }

  // Connect to the engine MCP for this request. If it's unreachable, degrade
  // gracefully to a tool-less chat rather than failing the whole request.
  let mcp: ContextEngineMcpSession | null = null;
  let tools: ContextEngineMcpTools = {};
  try {
    mcp = await openContextEngineMcp({ patientId, sessionId });
    tools = mcp.tools;
  } catch {
    mcp = null;
  }

  const result = streamText({
    model: anthropic("claude-opus-4-8"),
    system: mcp?.systemPrompt ?? FALLBACK_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(8),
    providerOptions: {
      anthropic: { thinking: { type: "adaptive" } },
    },
    onFinish: async (event) => {
      // Persist the assistant's reply (aggregated text across tool steps) so the
      // stored transcript reflects the full turn. Best-effort.
      if (sessionId && event.text) {
        await attempt(
          appendMessages(patientId, sessionId, [{ role: "assistant", content: event.text }]),
        );
      }
      void mcp?.close();
    },
    onAbort: () => {
      void mcp?.close();
    },
    onError: () => {
      void mcp?.close();
    },
  });

  // Accumulate per-step usage as the turn streams. `messageMetadata` runs for
  // every stream part, so we push on each `finish-step` and return the running
  // metadata (the i-th step lines up with the i-th `step-start` part client-side).
  const steps: ChatMessageMetadata["steps"] = [];
  const stream = createUIMessageStream<ChatUIMessage>({
    execute: ({ writer }) => {
      writer.merge(
        result.toUIMessageStream<ChatUIMessage>({
          messageMetadata: ({ part }) => {
            if (part.type === "finish-step") {
              const { inputTokens, outputTokens, totalTokens } = part.usage;
              steps.push({ inputTokens, outputTokens, totalTokens });
              return { steps: [...steps] };
            }
            if (part.type === "finish") {
              const { inputTokens, outputTokens, totalTokens } = part.totalUsage;
              return { inputTokens, outputTokens, totalTokens, steps: [...steps] };
            }
            return undefined;
          },
        }),
      );
    },
  });
  return createUIMessageStreamResponse({ stream });
}
