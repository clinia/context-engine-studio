// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import { PatientProvider } from "@/contexts/patient-provider";
import type { PatientListItem } from "@/lib/context-engine-client/actions";
import messages from "../../messages/en.json";

const actions = vi.hoisted(() => ({
  deletePatient: vi.fn(async () => ({ ok: true, data: undefined })),
  listPatients: vi.fn(async () => []),
}));
vi.mock("@/lib/context-engine-client/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const patient = { registryKey: "ava-reyes", patient: null } as unknown as PatientListItem;
const t = messages.navActions;

function renderDialog() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PatientProvider initialPatients={[patient]} activePatientId="ava-reyes">
        <DeletePatientDialog open onOpenChange={() => {}} />
      </PatientProvider>
    </NextIntlClientProvider>,
  );
  return {
    input: screen.getByLabelText("To confirm, type ava-reyes"),
    button: screen.getByRole("button", { name: t.confirmDelete }),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeletePatientDialog", () => {
  it("is an alert dialog that names the patient", () => {
    renderDialog();

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText('Delete "ava-reyes"?')).toBeTruthy();
  });

  it("enables the delete only once the patient ID is typed exactly", async () => {
    const { input, button } = renderDialog();
    expect(button.hasAttribute("disabled")).toBe(true);

    act(() => fireEvent.change(input, { target: { value: "ava-reye" } }));
    expect(button.hasAttribute("disabled")).toBe(true);

    act(() => fireEvent.change(input, { target: { value: "ava-reyes" } }));
    expect(button.hasAttribute("disabled")).toBe(false);

    await act(async () => fireEvent.click(button));
    expect(actions.deletePatient).toHaveBeenCalledWith("ava-reyes");
  });

  it("doesn't delete before the ID is typed", async () => {
    const { button } = renderDialog();
    await act(async () => fireEvent.click(button));

    expect(actions.deletePatient).not.toHaveBeenCalled();
  });
});
