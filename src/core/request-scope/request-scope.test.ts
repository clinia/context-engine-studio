import { describe, expect, it, vi } from "vitest";
import { runInRequestScope, type RequestScopeResolver } from "./request-scope";
import { getCurrentTenantId, tryGetCurrentTenant } from "@clinia/tenancy";
import { getCurrentUser, tryGetCurrentUser } from "@/core/user-scope";

const resolverFor = (tenantId: string, userId: string) => {
  const resolve = vi.fn(async () => ({ tenant: { id: tenantId }, user: { id: userId } }));
  return { resolve } satisfies RequestScopeResolver;
};

describe("runInRequestScope", () => {
  it("runs the function inside the resolved tenant and user scopes", async () => {
    const seen = await runInRequestScope(resolverFor("t1", "u1"), async () => {
      await Promise.resolve();
      return [getCurrentTenantId(), getCurrentUser().id];
    });

    expect(seen).toEqual(["t1", "u1"]);
    expect(tryGetCurrentTenant()).toBeUndefined();
    expect(tryGetCurrentUser()).toBeUndefined();
  });

  it("reuses the enclosing scope without resolving again", async () => {
    const inner = resolverFor("t2", "u2");

    const seen = await runInRequestScope(resolverFor("t1", "u1"), () =>
      runInRequestScope(inner, async () => [getCurrentTenantId(), getCurrentUser().id]),
    );

    expect(seen).toEqual(["t1", "u1"]);
    expect(inner.resolve).not.toHaveBeenCalled();
  });

  it("does not run the function when resolution fails", async () => {
    const fn = vi.fn(async () => undefined);
    const failing: RequestScopeResolver = {
      resolve: async () => {
        throw new Error("no workspace");
      },
    };

    await expect(runInRequestScope(failing, fn)).rejects.toThrow("no workspace");
    expect(fn).not.toHaveBeenCalled();
  });
});
