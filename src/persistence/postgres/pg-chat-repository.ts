import { getCurrentTenantId } from "@clinia/tenancy";
import { getCurrentUser } from "@/core/user-scope";
import type { ChatUIMessage } from "@/lib/chat-types";
import type { ChatRepository, ChatSummary } from "@/persistence/chat-repository";
import { and, asc, desc, eq } from "drizzle-orm";
import type { StudioDatabase } from "./database/connection";
import { chatsTable, messagesTable } from "./schema";

const TITLE_MAX_LENGTH = 60;
const DEFAULT_TITLE = "New chat";

/** Flattens a UI message's text parts into a single trimmed string. */
function messageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

/** Derives a chat title from the first user message, truncated for the sidebar. */
function deriveTitle(messages: ChatUIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser ? messageText(firstUser) : "";
  if (!text) return DEFAULT_TITLE;
  return text.length > TITLE_MAX_LENGTH
    ? `${text.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : text;
}

type ChatScope = { tenantId: string; userId: string };

/** The current tenant and user. Throws outside their scopes. */
function currentScope(): ChatScope {
  return { tenantId: getCurrentTenantId(), userId: getCurrentUser().id };
}

/** Matches the chat rows owned by `scope`. */
function ownedChat(scope: ChatScope, chatId: string) {
  return and(
    eq(chatsTable.tenantId, scope.tenantId),
    eq(chatsTable.userId, scope.userId),
    eq(chatsTable.chatId, chatId),
  );
}

/** Postgres-backed {@link ChatRepository}, for PGlite or a Postgres server. */
export class PgChatRepository implements ChatRepository {
  constructor(private readonly db: StudioDatabase) {}

  async listChats(patientId: string): Promise<ChatSummary[]> {
    const scope = currentScope();
    const rows = await this.db
      .select({
        chatId: chatsTable.chatId,
        title: chatsTable.title,
        updatedAt: chatsTable.updatedAt,
      })
      .from(chatsTable)
      .where(
        and(
          eq(chatsTable.tenantId, scope.tenantId),
          eq(chatsTable.userId, scope.userId),
          eq(chatsTable.patientId, patientId),
        ),
      )
      .orderBy(desc(chatsTable.updatedAt));

    return rows.map((row) => ({
      chatId: row.chatId,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getMessages(patientId: string, chatId: string): Promise<ChatUIMessage[]> {
    const scope = currentScope();
    const rows = await this.db
      .select({ data: messagesTable.data })
      .from(messagesTable)
      .innerJoin(
        chatsTable,
        and(
          eq(messagesTable.tenantId, chatsTable.tenantId),
          eq(messagesTable.userId, chatsTable.userId),
          eq(messagesTable.chatId, chatsTable.chatId),
        ),
      )
      .where(and(ownedChat(scope, chatId), eq(chatsTable.patientId, patientId)))
      .orderBy(asc(messagesTable.ordinal));

    return rows.map((row) => row.data);
  }

  async saveChat(patientId: string, chatId: string, messages: ChatUIMessage[]): Promise<void> {
    const { tenantId, userId } = currentScope();
    const now = new Date();
    await this.db.transaction(async (tx) => {
      // The title is derived on first save only; later saves bump updatedAt.
      await tx
        .insert(chatsTable)
        .values({
          tenantId,
          userId,
          chatId,
          patientId,
          title: deriveTitle(messages),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [chatsTable.tenantId, chatsTable.userId, chatsTable.chatId],
          set: { updatedAt: now, patientId },
        });

      // The client sends the full message list each turn, so the transcript is replaced.
      await tx
        .delete(messagesTable)
        .where(
          and(
            eq(messagesTable.tenantId, tenantId),
            eq(messagesTable.userId, userId),
            eq(messagesTable.chatId, chatId),
          ),
        );
      if (messages.length > 0) {
        await tx.insert(messagesTable).values(
          messages.map((message, ordinal) => ({
            tenantId,
            userId,
            chatId,
            messageId: message.id,
            ordinal,
            data: message,
          })),
        );
      }
    });
  }
}
