// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { useIngestionStartedToast } from "@/hooks/use-ingestion-started-toast";
import messages from "../../messages/en.json";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function Harness() {
  const notify = useIngestionStartedToast();
  return <button onClick={() => notify("jeanne-tremblay", 3)}>ingest</button>;
}

function renderApp() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Harness />
      <Toaster closeButton />
    </NextIntlClientProvider>,
  );
  act(() => fireEvent.click(screen.getByText("ingest")));
}

afterEach(() => {
  // Sonner's store outlives the render: a toast that never times out would leak into the next test.
  act(() => toast.dismiss());
  cleanup();
  push.mockReset();
  vi.useRealTimers();
});

describe("useIngestionStartedToast", () => {
  it("says how many files went in, and stays until it's dismissed", async () => {
    vi.useFakeTimers();
    renderApp();
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(screen.getByText("3 files accepted")).toBeTruthy();
    expect(screen.getByText(messages.ingestions.startedDescription)).toBeTruthy();
    expect(screen.getByRole("button", { name: messages.ingestions.startedAction })).toBeTruthy();
    expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
  });

  it("opens the patient's ingestions from its action, and closes", async () => {
    renderApp();
    const action = await screen.findByRole("button", { name: messages.ingestions.startedAction });
    const shown = action.closest("[data-sonner-toast]");
    await act(async () => fireEvent.click(action));

    expect(push).toHaveBeenCalledWith("/patients/jeanne-tremblay/ingestions");
    // Sonner keeps a dismissed toast mounted for its exit animation, marked as removed.
    await vi.waitFor(() => expect(shown?.getAttribute("data-removed")).toBe("true"));
  });
});
