import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type User = {
  /** The user's token `sub`. */
  id: string;
};

const userStorage = new AsyncLocalStorage<User>();

/** Runs `fn` with `user` as the current user for its whole async call tree. */
export function runWithUser<T>(user: User, fn: () => Promise<T> | T): Promise<T> | T {
  return userStorage.run(user, fn);
}

/** @throws outside {@link runWithUser}. */
export function getCurrentUser(): User {
  const user = userStorage.getStore();
  if (!user) {
    throw new Error("missing user scope: call runWithUser() to establish it");
  }
  return user;
}

export function tryGetCurrentUser(): User | undefined {
  return userStorage.getStore();
}
