/**
 * Captures every Studio screen and state at four widths, then checks each one for clipped
 * text and runs axe. Used to compare the UI before and after a visual change.
 *
 * Run `pnpm build` first, then `pnpm screenshots <out-dir>`. It starts two servers from the
 * build on their own ports with a throwaway chat database: one against the workspace in
 * `.env.local`, and one against a local stub that has no patients, for the onboarding screen.
 * It only reads from the workspace: dialogs that would write are opened, never submitted.
 *
 * Writes `<out-dir>/<width>/<state>.png`, `overflow.json`, `axe.json` and `errors.json`.
 * The states use the patient and file below; override them with `SHOTS_PATIENT` and `SHOTS_FILE`.
 */
import AxeBuilder from "@axe-core/playwright";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

const out = resolve(process.argv[2] ?? "");
if (!process.argv[2]) {
  console.error("usage: pnpm screenshots <out-dir>");
  process.exit(1);
}

const PATIENT = process.env.SHOTS_PATIENT ?? "jeanne-tremblay";
const FILE = process.env.SHOTS_FILE ?? "/medications/current/atorvastatin_ecee1b5a";
const WIDTHS = [1440, 1024, 800, 390];
const PORTS = { studio: 3410, onboarding: 3411, stub: 3412 };
// Fixed, so the chat screen's URL is the same on every run.
const CHAT_ID = "00000000-0000-4000-8000-000000000000";
const MOBILE = 768;

const base = `http://localhost:${PORTS.studio}`;
const patientPath = `/patients/${encodeURIComponent(PATIENT)}`;

type State = {
  name: string;
  path: string;
  server?: "studio" | "onboarding";
  /** Opens the off-canvas sidebar first on narrow widths, for states that start there. */
  sidebar?: boolean;
  act?: (page: Page) => Promise<void>;
};

function openSwitcher(page: Page) {
  return page.getByTestId("patient-switcher-trigger").click();
}

const STATES: State[] = [
  { name: "patient", path: patientPath },
  { name: "switcher", path: patientPath, sidebar: true, act: openSwitcher },
  {
    name: "create-patient",
    path: patientPath,
    sidebar: true,
    act: async (page) => {
      await openSwitcher(page);
      await page.getByText("Create patient").click();
    },
  },
  {
    name: "delete-patient",
    path: patientPath,
    sidebar: true,
    act: (page) => page.getByRole("button", { name: "Delete patient" }).click(),
  },
  {
    name: "header-menu",
    path: patientPath,
    act: (page) => page.locator("header button").last().click(),
  },
  {
    name: "vfs-tree",
    path: patientPath,
    sidebar: true,
    act: async (page) => {
      await page.getByRole("button", { name: "medications", exact: true }).click();
      await page.getByRole("button", { name: "current", exact: true }).click();
    },
  },
  { name: "file", path: `${patientPath}?path=${encodeURIComponent(FILE)}` },
  {
    name: "file-compact",
    path: `${patientPath}?path=${encodeURIComponent(FILE)}`,
    act: (page) => page.getByRole("tab", { name: "Compact" }).click(),
  },
  {
    name: "file-structured",
    path: `${patientPath}?path=${encodeURIComponent(FILE)}`,
    act: (page) => page.getByRole("tab", { name: "Structured" }).click(),
  },
  {
    name: "file-resolution",
    path: `${patientPath}?path=${encodeURIComponent(FILE)}`,
    act: (page) => page.getByRole("button", { name: "Resolution", exact: true }).last().click(),
  },
  { name: "ingestions", path: `${patientPath}/ingestions` },
  {
    name: "ingestion-detail",
    path: `${patientPath}/ingestions`,
    act: (page) => page.locator("tbody tr").first().click(),
  },
  {
    name: "ingestions-filter",
    path: `${patientPath}/ingestions`,
    act: (page) =>
      page
        .getByRole("button", { name: /filter/i })
        .first()
        .click(),
  },
  { name: "resolution", path: `${patientPath}/resolution` },
  {
    name: "resolution-detail",
    path: `${patientPath}/resolution`,
    act: (page) => page.locator("tbody tr").first().click(),
  },
  { name: "chat", path: `${patientPath}/chat/${CHAT_ID}` },
  { name: "not-found", path: "/patients/no-such-patient-shots" },
  { name: "onboarding", path: "/onboarding", server: "onboarding" },
];

/** A Context Engine stand-in with no patients, so `/onboarding` renders instead of redirecting. */
function startStub() {
  const server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && req.url?.startsWith("/v1/patients")) {
      res.end(JSON.stringify({ data: [], meta: { total: 0, page: 0, perPage: 100 } }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });
  server.listen(PORTS.stub);
  return server;
}

function startStudio(port: number, env: Record<string, string>): ChildProcess {
  return spawn("pnpm", ["exec", "next", "start", "-p", String(port)], {
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
}

async function waitFor(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(url, { redirect: "manual" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`${url} did not start`);
}

/** Elements with their own text whose content is cut off: not scrollable, not an intended ellipsis or clamp. */
function findClipped() {
  const clipped: { el: string; text: string; scroll: string; client: string }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("body *")) {
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
    if (!ownText || !el.offsetParent) continue;
    const s = getComputedStyle(el);
    const scrolls = /auto|scroll/.test(s.overflowX + s.overflowY);
    const intended = s.textOverflow === "ellipsis" || s.webkitLineClamp !== "none";
    const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    if (overflows && !scrolls && !intended && el.clientWidth > 0) {
      const slot = el.dataset.slot ? `[data-slot=${el.dataset.slot}]` : "";
      clipped.push({
        el: `${el.tagName.toLowerCase()}${slot}`,
        text: (el.textContent ?? "").trim().slice(0, 60),
        scroll: `${el.scrollWidth}x${el.scrollHeight}`,
        client: `${el.clientWidth}x${el.clientHeight}`,
      });
    }
  }
  return clipped;
}

const db = mkdtempSync(join(tmpdir(), "studio-shots-"));
const stub = startStub();
const servers = [
  startStudio(PORTS.studio, { STUDIO_DATABASE_URL: `file:${join(db, "studio")}` }),
  startStudio(PORTS.onboarding, {
    STUDIO_DATABASE_URL: `file:${join(db, "onboarding")}`,
    CLINIA_CONTEXT_ENGINE_API_URL: `http://localhost:${PORTS.stub}`,
    CLINIA_CONTEXT_ENGINE_INSECURE: "true",
  }),
];

const overflow: Record<string, unknown> = {};
const axe: Record<string, unknown> = {};
const errors: Record<string, string> = {};

try {
  await Promise.all([waitFor(base), waitFor(`http://localhost:${PORTS.onboarding}`)]);
  const browser = await chromium.launch({
    args: ["--disable-blink-features=AutomationControlled"],
  });

  for (const width of WIDTHS) {
    mkdirSync(join(out, String(width)), { recursive: true });
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      locale: "en-US",
      timezoneId: "America/Toronto",
      reducedMotion: "reduce",
    });

    for (const state of STATES) {
      const key = `${width}/${state.name}`;
      const page = await context.newPage();
      try {
        const origin =
          state.server === "onboarding" ? `http://localhost:${PORTS.onboarding}` : base;
        await page.goto(origin + state.path, { waitUntil: "networkidle" });
        if (state.sidebar && width < MOBILE) {
          await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
        }
        await state.act?.(page);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(600);

        overflow[key] = await page.evaluate(findClipped);
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
          .analyze();
        axe[key] = result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        }));

        await page.screenshot({
          path: join(out, String(width), `${state.name}.png`),
          animations: "disabled",
          // Relative times change from one run to the next.
          mask: [page.getByText(/\bago\b/)],
        });
      } catch (error) {
        errors[key] = error instanceof Error ? error.message.split("\n")[0] : String(error);
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();
} finally {
  for (const server of servers) server.kill();
  stub.close();
}

writeFileSync(join(out, "overflow.json"), JSON.stringify(overflow, null, 1));
writeFileSync(join(out, "axe.json"), JSON.stringify(axe, null, 1));
writeFileSync(join(out, "errors.json"), JSON.stringify(errors, null, 1));
console.log(
  `${Object.keys(axe).length} states captured, ${Object.keys(errors).length} failed. See ${out}`,
);
