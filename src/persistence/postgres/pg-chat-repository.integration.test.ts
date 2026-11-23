import type { ChatUIMessage } from "@/lib/chat-types";
import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithTenant } from "@clinia/tenancy";
import { runWithUser } from "@/core/user-scope";
import { PgChatRepository } from "./pg-chat-repository";
import { openPglite } from "./database/connection";
import { chatsTable, messagesTable } from "./schema";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../migrations");

type ChatScope = { tenantId: string; userId: string };

const scope: ChatScope = { tenantId: "t1", userId: "u1" };

/** Runs `fn` as the user of `owner`. */
const as = <T>(owner: ChatScope, fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ id: owner.tenantId }, () => runWithUser({ id: owner.userId }, fn)) as Promise<T>;

const message = (id: string, role: "user" | "assistant", text: string): ChatUIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

describe("PgChatRepository on PGlite", () => {
  let opened: ReturnType<typeof openPglite>;
  let repository: PgChatRepository;

  beforeEach(async () => {
    opened = openPglite();
    await migrate(opened.db, { migrationsFolder: MIGRATIONS });
    repository = new PgChatRepository(opened.db);
  });

  afterEach(async () => {
    await opened.close();
  });

  it("lists a patient's chats most recent first, with ISO timestamps", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
    await as(scope, () => repository.saveChat("p1", "s1", [message("m1", "user", "first")]));
    vi.setSystemTime(new Date("2026-01-01T00:00:01Z"));
    await as(scope, () => repository.saveChat("p1", "s2", [message("m2", "user", "second")]));
    vi.setSystemTime(new Date("2026-01-01T00:00:02Z"));
    await as(scope, () =>
      repository.saveChat("p1", "s1", [
        message("m1", "user", "first"),
        message("m3", "assistant", "hi"),
      ]),
    );
    vi.useRealTimers();

    const chats = await as(scope, () => repository.listChats("p1"));

    expect(chats.map((chat) => [chat.chatId, chat.updatedAt])).toEqual([
      ["s1", "2026-01-01T00:00:02.000Z"],
      ["s2", "2026-01-01T00:00:01.000Z"],
    ]);
  });

  it("hides another patient's chats and messages", async () => {
    await as(scope, () => repository.saveChat("p1", "s1", [message("m1", "user", "mine")]));

    expect(await as(scope, () => repository.listChats("p2"))).toEqual([]);
    expect(await as(scope, () => repository.getMessages("p2", "s1"))).toEqual([]);
  });

  it.each<[string, ChatScope]>([
    ["user", { tenantId: "t1", userId: "u2" }],
    ["tenant", { tenantId: "t2", userId: "u1" }],
  ])("hides a chat from another %s", async (_, other) => {
    await as(scope, () => repository.saveChat("p1", "s1", [message("m1", "user", "mine")]));

    expect(await as(other, () => repository.listChats("p1"))).toEqual([]);
    expect(await as(other, () => repository.getMessages("p1", "s1"))).toEqual([]);
  });

  it("keeps the same session id under another user as a separate chat", async () => {
    const other: ChatScope = { tenantId: "t1", userId: "u2" };
    await as(scope, () => repository.saveChat("p1", "s1", [message("m1", "user", "mine")]));
    await as(other, () => repository.saveChat("p1", "s1", [message("m2", "user", "theirs")]));

    expect(await as(scope, () => repository.getMessages("p1", "s1"))).toEqual([
      message("m1", "user", "mine"),
    ]);
    expect(await as(other, () => repository.getMessages("p1", "s1"))).toEqual([
      message("m2", "user", "theirs"),
    ]);
    expect((await as(scope, () => repository.listChats("p1")))[0].title).toBe("mine");
  });

  it("throws outside a tenant and user scope", async () => {
    await expect(repository.listChats("p1")).rejects.toThrow(/tenant context/);
    await expect(
      runWithTenant({ id: "t1" }, () => repository.getMessages("p1", "s1")),
    ).rejects.toThrow(/user scope/);
    await expect(
      runWithUser({ id: "u1" }, () => repository.saveChat("p1", "s1", [])),
    ).rejects.toThrow(/tenant context/);
  });

  it("returns no messages for an unknown session", async () => {
    expect(await as(scope, () => repository.getMessages("p1", "missing"))).toEqual([]);
  });

  it("replaces the transcript on every save, keeping ordinals contiguous", async () => {
    const long = [
      message("a", "user", "1"),
      message("b", "assistant", "2"),
      message("c", "user", "3"),
    ];
    await as(scope, () => repository.saveChat("p1", "s1", long));
    await as(scope, () => repository.saveChat("p1", "s1", [message("x", "user", "only")]));

    expect(await as(scope, () => repository.getMessages("p1", "s1"))).toEqual([
      message("x", "user", "only"),
    ]);
    const ordinals = await opened.db
      .select({ ordinal: messagesTable.ordinal })
      .from(messagesTable)
      .where(eq(messagesTable.chatId, "s1"))
      .orderBy(asc(messagesTable.ordinal));
    expect(ordinals).toEqual([{ ordinal: 0 }]);

    await as(scope, () => repository.saveChat("p1", "s1", []));
    expect(await as(scope, () => repository.getMessages("p1", "s1"))).toEqual([]);
    expect(await as(scope, () => repository.listChats("p1"))).toHaveLength(1);
  });

  it("derives the title from the first user message once", async () => {
    await as(scope, () =>
      repository.saveChat("p1", "s1", [
        message("m1", "assistant", "hello"),
        message("m2", "user", "  Labs?  "),
      ]),
    );
    await as(scope, () =>
      repository.saveChat("p1", "s1", [message("m3", "user", "something else")]),
    );

    expect((await as(scope, () => repository.listChats("p1")))[0].title).toBe("Labs?");
  });

  it("truncates long titles and falls back to a default", async () => {
    await as(scope, () => repository.saveChat("p1", "s1", [message("m1", "user", "x".repeat(80))]));
    await as(scope, () => repository.saveChat("p1", "s2", []));

    const titles = Object.fromEntries(
      (await as(scope, () => repository.listChats("p1"))).map((c) => [c.chatId, c.title]),
    );
    expect(titles.s1).toBe(`${"x".repeat(59)}…`);
    expect(titles.s2).toBe("New chat");
  });

  it("round-trips message parts and metadata", async () => {
    const rich: ChatUIMessage = {
      id: "m1",
      role: "assistant",
      metadata: { steps: [{ inputTokens: 10, outputTokens: 3 }] },
      parts: [
        { type: "step-start" },
        { type: "text", text: 'Ünïcode ✓ and "quotes"', state: "done" },
      ],
    };
    await as(scope, () => repository.saveChat("p1", "s1", [rich]));

    expect(await as(scope, () => repository.getMessages("p1", "s1"))).toEqual([rich]);
  });

  it("deletes a chat's messages with the chat", async () => {
    await as(scope, () =>
      repository.saveChat("p1", "s1", [
        message("m1", "user", "a"),
        message("m2", "assistant", "b"),
      ]),
    );

    await opened.db.delete(chatsTable).where(eq(chatsTable.chatId, "s1"));

    expect(await opened.db.select().from(messagesTable)).toEqual([]);
  });
});
