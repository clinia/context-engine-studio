import "server-only";

import { runWithTenant, tryGetCurrentTenant, type Tenant } from "@clinia/tenancy";
import { runWithUser, tryGetCurrentUser, type User } from "@/core/user-scope";

/** Who a request acts for. */
export type RequestScope = { tenant: Tenant; user: User };

/** Resolves the tenant and user of the request being handled. */
export interface RequestScopeResolver {
  /** @throws when the request has no tenant or user it may act for. */
  resolve(): Promise<RequestScope>;
}

/** The one tenant and user every request acts for while the studio has no sign-in. */
export const LOCAL_REQUEST_SCOPE: RequestScope = {
  tenant: { id: "local" },
  user: { id: "local" },
};

/** Resolves every request to {@link LOCAL_REQUEST_SCOPE}. */
export class LocalRequestScopeResolver implements RequestScopeResolver {
  async resolve(): Promise<RequestScope> {
    return LOCAL_REQUEST_SCOPE;
  }
}

/**
 * Runs `fn` inside the tenant and user scopes `resolver` resolves.
 * - Inside both scopes already, runs `fn` in them without resolving again.
 */
export async function runInRequestScope<T>(
  resolver: RequestScopeResolver,
  fn: () => Promise<T>,
): Promise<T> {
  if (tryGetCurrentTenant() && tryGetCurrentUser()) return fn();
  const { tenant, user } = await resolver.resolve();
  return runWithTenant(tenant, () => runWithUser(user, fn));
}
