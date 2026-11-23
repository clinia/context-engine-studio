// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Composer } from "@/components/chat/composer";
import messages from "../../../messages/en.json";

function renderComposer(props: { value: string; isBusy?: boolean }) {
  const handlers = { onChange: vi.fn(), onSubmit: vi.fn(), onStop: vi.fn() };
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Composer value={props.value} isBusy={props.isBusy ?? false} {...handlers} />
    </NextIntlClientProvider>,
  );
  return { ...handlers, textarea: screen.getByLabelText(messages.chat.placeholder) };
}

afterEach(cleanup);

describe("Composer", () => {
  it("sends on Enter, and not on Shift+Enter", () => {
    const { textarea, onSubmit } = renderComposer({ value: "Current medications?" });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("doesn't send an empty message", () => {
    const { textarea, onSubmit } = renderComposer({ value: "   " });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: messages.chat.send }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("reports typing, and offers stop while a reply streams", () => {
    const { textarea, onChange, onStop, onSubmit } = renderComposer({ value: "hi", isBusy: true });
    fireEvent.change(textarea, { target: { value: "hi there" } });
    expect(onChange).toHaveBeenCalledWith("hi there");

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: messages.chat.stop }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
