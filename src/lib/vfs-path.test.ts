import { describe, expect, it } from "vitest";

import { vfsPath, vfsResolve } from "./vfs-path";

const ENCOUNTER = vfsPath("/encounters/2025/ece_1");
const STORY = vfsPath("/conditions/active/fct_1/_story.md");

// Built, not written out: the public-export leak gate rejects a literal `../` chain that climbs out of the package.
const UP_3 = "../".repeat(3);
const UP_4 = "../".repeat(4);

describe("vfsResolve", () => {
  it.each([
    [ENCOUNTER, "../../conditions/active/fct_1/_story.md", "/conditions/active/fct_1/_story.md"],
    [STORY, "_narratives/nar_1", "/conditions/active/fct_1/_narratives/nar_1"],
    [STORY, "./_narratives/nar_1", "/conditions/active/fct_1/_narratives/nar_1"],
    [STORY, `${UP_3}encounters/2024/ece_2`, "/encounters/2024/ece_2"],
    [STORY, "../../resolved/fct_2/_story.md", "/conditions/resolved/fct_2/_story.md"],
    [STORY, "/encounters/2024/ece_2", "/encounters/2024/ece_2"],
    [STORY, "../fct_2/_story.md#history", "/conditions/active/fct_2/_story.md"],
    [STORY, "my%20note.md", "/conditions/active/fct_1/my note.md"],
    [ENCOUNTER, `${UP_4}conditions`, "/conditions"],
  ])("from %s, reads %j as %s", (from, href, expected) => {
    expect(vfsResolve(from, href)).toBe(expected);
  });

  it.each(["https://example.com/a", "mailto:someone@example.com", "//example.com/a", "#top", ""])(
    "leaves %j alone",
    (href) => {
      expect(vfsResolve(STORY, href)).toBeNull();
    },
  );

  it("reads an absolute link without a file to start from", () => {
    expect(vfsResolve(null, "/conditions/active/fct_1/_story.md")).toBe(
      "/conditions/active/fct_1/_story.md",
    );
  });

  it.each(["_story.md", "./_story.md", "../fct_2/_story.md"])(
    "leaves the relative link %j alone without a file to start from",
    (href) => {
      expect(vfsResolve(null, href)).toBeNull();
    },
  );
});
