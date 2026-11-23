import "server-only";

import { getDriver, type Driver } from "@/core/driver";
import { runInRequestScope } from "./request-scope";

/**
 * Defines a server action that runs with the driver, inside the request's tenant and user
 * scopes. `fn` receives the driver, then the caller's arguments.
 * - Define every action with it: a scope set in the proxy does not reach the action.
 * - The action rejects when the request's tenant or user cannot be resolved.
 */
export function defineAction<Args extends unknown[], R>(
  fn: (driver: Driver, ...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  return async (...args) => {
    const driver = getDriver();
    return runInRequestScope(driver.getRequestScopeResolver(), () => fn(driver, ...args));
  };
}

/** Defines a route handler the way {@link defineAction} defines an action. */
export function defineRouteHandler<Ctx>(
  fn: (driver: Driver, req: Request, ctx: Ctx) => Promise<Response>,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return defineAction(fn);
}
