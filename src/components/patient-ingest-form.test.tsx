// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatientIngestForm } from "@/components/patient-ingest-form";
import messages from "../../messages/en.json";

const actions = vi.hoisted(() => ({
  upsertPatient: vi.fn(async () => ({ ok: true, data: {} })),
  ingestFhirR4: vi.fn(async () => ({ ok: true, data: {} })),
  ingestCdaR2: vi.fn(async () => ({ ok: true, data: {} })),
  ingestFile: vi.fn(),
}));
vi.mock("@/lib/context-engine-client/actions", () => actions);

const t = messages.patientIngest;

function folderFile(name: string, content: string, type = "application/json") {
  const file = new File([content], name, { type });
  Object.defineProperty(file, "webkitRelativePath", { value: `ava-reyes/${name}` });
  return file;
}

const EXTRACTION_FAILED = "text extraction failed; nothing was stored";

async function submitPdfs(names: string[]) {
  const { onSuccess, fileInput } = renderForm();
  const pdfs = names.map((name) => folderFile(name, "%PDF-1.7", "application/pdf"));
  await act(async () => fireEvent.change(fileInput, { target: { files: pdfs } }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: t.submit })));
  return { onSuccess };
}

function renderForm() {
  const onSuccess = vi.fn();
  const { container } = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PatientIngestForm onSuccess={onSuccess} />
    </NextIntlClientProvider>,
  );
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onSuccess, fileInput };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PatientIngestForm", () => {
  it("names the patient after the picked folder, and ingests each file", async () => {
    const { onSuccess, fileInput } = renderForm();
    const bundle = JSON.stringify({ resourceType: "Bundle", type: "collection", entry: [] });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [folderFile("bundle.json", bundle)] } });
    });

    expect(screen.getByLabelText(t.patientIdLabel)).toHaveProperty("value", "ava-reyes");
    expect(screen.getByText("1 file detected")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.submit })));

    expect(actions.upsertPatient).toHaveBeenCalledWith("ava-reyes");
    expect(actions.ingestFhirR4).toHaveBeenCalledTimes(1);
    expect(actions.ingestFhirR4.mock.calls[0]).toEqual(["ava-reyes", JSON.parse(bundle)]);
    expect(onSuccess).toHaveBeenCalledWith("ava-reyes", 1);
  });

  it("on an empty submit, names what's missing and moves focus to the patient ID", async () => {
    renderForm();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.submit })));

    expect(screen.getByText(t.errors.patientIdRequired)).toBeTruthy();
    expect(screen.getByText(t.errors.noFiles)).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(t.patientIdLabel));
    expect(actions.upsertPatient).not.toHaveBeenCalled();
  });

  it("keeps the hint under the patient ID, not in it", () => {
    renderForm();

    expect(screen.getByText(t.patientIdPlaceholder)).toBeTruthy();
    expect(screen.getByLabelText(t.patientIdLabel).getAttribute("placeholder")).toBeNull();
  });

  it("names the file when the only PDF fails", async () => {
    actions.ingestFile.mockResolvedValue({
      ok: true,
      data: { status: "failed", extraction: true, message: EXTRACTION_FAILED },
    });
    const { onSuccess } = await submitPdfs(["labs.pdf"]);

    expect(screen.getByText(`labs.pdf: ${EXTRACTION_FAILED}`)).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("sums up when every PDF fails, instead of naming the first", async () => {
    actions.ingestFile.mockResolvedValue({
      ok: true,
      data: { status: "failed", extraction: true, message: EXTRACTION_FAILED },
    });
    const { onSuccess } = await submitPdfs(["labs.pdf", "discharge-summary.pdf"]);

    expect(screen.getByText(t.errors.noneIngested.replace("{count}", "2"))).toBeTruthy();
    expect(screen.queryByText(`labs.pdf: ${EXTRACTION_FAILED}`)).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("ticks a PDF the server kept a receipt for, even when no text was read", async () => {
    actions.ingestFile.mockResolvedValue({ ok: true, data: { status: "accepted", ingestion: {} } });
    const { onSuccess } = await submitPdfs(["scan.pdf", "referral.png"]);

    expect(screen.queryByRole("button", { name: t.continue })).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith("ava-reyes", 2);
  });

  it("keeps the server's message when file ingestion is off, however many files", async () => {
    const disabled = "File ingestion is not enabled for this workspace";
    actions.ingestFile.mockResolvedValue({
      ok: true,
      data: { status: "disabled", message: disabled },
    });
    await submitPdfs(["labs.pdf", "discharge-summary.pdf"]);

    expect(screen.getByText(disabled)).toBeTruthy();
    expect(actions.ingestFile).toHaveBeenCalledTimes(1);
  });
});
