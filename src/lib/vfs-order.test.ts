import { describe, expect, it } from "vitest";

import { orderByCountHint } from "./vfs-order";

describe("orderByCountHint", () => {
  it("puts counted entries first, uncounted next and empty ones last, keeping order within each group", () => {
    const entries = [
      { name: "empty-a", countHint: 0 },
      { name: "plain-a" },
      { name: "few", countHint: 1 },
      { name: "empty-b", countHint: 0 },
      { name: "many", countHint: 12 },
      { name: "plain-b" },
    ];

    expect(orderByCountHint(entries).map((e) => e.name)).toEqual([
      "few",
      "many",
      "plain-a",
      "plain-b",
      "empty-a",
      "empty-b",
    ]);
  });
});
