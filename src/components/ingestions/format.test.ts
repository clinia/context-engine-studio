import { describe, expect, it } from "vitest";

import { formatByteLimit, formatPageRanges } from "@/components/ingestions/format";

describe("formatPageRanges", () => {
  it.each([
    [[2], "2"],
    [[1, 3], "1, 3"],
    [[1, 2], "1–2"],
    [[1, 2, 3, 5, 7, 8], "1–3, 5, 7–8"],
    [Array.from({ length: 200 }, (_, i) => i + 1), "1–200"],
    [[], ""],
  ])("writes %j as %s", (pages, expected) => {
    expect(formatPageRanges(pages)).toBe(expected);
  });
});

describe("formatByteLimit", () => {
  it.each([
    [1000, "1 kB"],
    [10_000_000, "10 MB"],
    [1_500_000, "1.5 MB"],
    [1_001_000, "1.001 MB"],
    [2_500_000_000, "2.5 GB"],
    [1536, "1.5 KiB"],
    [524_288, "512 KiB"],
    [20 * 1024 ** 2, "20 MiB"],
    [67_108_864, "64 MiB"],
    [3 * 1024 ** 4, "3 TiB"],
    [512, "512 bytes"],
    [50_000_001, "50000001 bytes"],
  ])("writes %d as %s", (bytes, expected) => {
    expect(formatByteLimit(bytes)).toBe(expected);
  });
});
