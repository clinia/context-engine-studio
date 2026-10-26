import type { ChatMessageMetadata, ChatUIMessage } from "@/lib/chat-types";
import { toSession } from "@/lib/chat/session";
import { ingestSession } from "@/lib/context-engine-client/actions";
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
} from "ai";

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
 * the `sessionId` (the chat id, which is the engine session the tool calls are recorded
 * on). It opens an ephemeral engine MCP connection for the request, streams a
 * tool-using Claude response, and closes the MCP connection once the model is done.
 * The conversation is imported as that session twice per turn — up to the new user
 * message before the model runs, then with the reply once it completes — which is what
 * forms the patient's memories from it.
 */
export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId: rawPatientId } = await params;
  const patientId = decodeURIComponent(rawPatientId);
  const { messages, sessionId } = (await req.json()) as {
    messages: ChatUIMessage[];
    sessionId?: string;
  };

  // Connect to the engine MCP for this request. If it's unreachable, degrade
  // gracefully to a tool-less chat rather than failing the whole request.
  // Alongside, import the conversation up to the new user message: a session orders by
  // write position, and each tool call is recorded on the session as it runs, so the user
  // message must be stored first to sit before the tool calls it prompts.
  const [mcp] = await Promise.all([
    openContextEngineMcp({ patientId, sessionId }).catch(
      (): ContextEngineMcpSession | null => null,
    ),
    sessionId ? attempt(ingestSession(patientId, sessionId, toSession(messages))) : null,
  ]);
  const tools: ContextEngineMcpTools = mcp?.tools ?? {};

  const result = streamText({
    model: anthropic("claude-opus-4-8"),
    system: mcp?.systemPrompt ?? FALLBACK_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(8),
    providerOptions: {
      anthropic: { thinking: { type: "adaptive" } },
    },
    onFinish: () => {
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
    // Given, so `onEnd` sees the conversation with this turn's reply appended.
    originalMessages: messages,
    // Import after every completed turn: turns the session already holds are recognised and
    // not stored again, so this import adds only the reply. Built from the same UI
    // messages the next request resends, so the stored turns always match what comes back.
    // Best-effort — a failed import costs this turn's memories, never the reply.
    onEnd: async ({ messages: conversation, isAborted }) => {
      if (!sessionId || isAborted) return;
      await attempt(ingestSession(patientId, sessionId, toSession(conversation)));
    },
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
