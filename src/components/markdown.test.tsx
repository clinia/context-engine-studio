// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Markdown } from "@/components/markdown";

const CONTENT = "[story](../story.md) and [guideline](https://example.com/guideline)";

function resolveLink(href: string) {
  return href.startsWith("https:") ? null : `/app?path=${encodeURIComponent(href)}`;
}

afterEach(cleanup);

describe("Markdown", () => {
  it("points a link the resolver maps at its in-app URL", () => {
    render(<Markdown resolveLink={resolveLink}>{CONTENT}</Markdown>);

    expect(screen.getByRole("link", { name: "story" }).getAttribute("href")).toBe(
      "/app?path=..%2Fstory.md",
    );
  });

  it("leaves a link the resolver declines as written", () => {
    render(<Markdown resolveLink={resolveLink}>{CONTENT}</Markdown>);

    expect(screen.getByRole("link", { name: "guideline" }).getAttribute("href")).toBe(
      "https://example.com/guideline",
    );
  });
});
