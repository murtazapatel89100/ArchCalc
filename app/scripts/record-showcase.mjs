#!/usr/bin/env node
/**
 * Records the ArchCalc showcase videos.
 *
 * Runs the Vite frontend in headless Chromium with the Tauri IPC layer mocked, drives a scripted
 * tour of every feature, captures frames through the Chrome DevTools screencast (much sharper than
 * Playwright's built-in recorder), and encodes them with ffmpeg.
 *
 *   pnpm showcase   → web/public/videos (full tour, per-feature clips, poster)
 *                     web/public/images/screens (screenshots for the docs)
 *
 * Requires ffmpeg on PATH and a Playwright Chromium (`pnpm exec playwright install chromium`).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(appDir, "..");
const screenshotDir = path.join(repoDir, "web", "public", "images", "screens");
// CSS viewport × deviceScaleFactor = captured frame size; frames are downscaled to the viewport.
const cfg = { width: 1280, height: 800, dpr: 1.5 };

const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });

// ---------------------------------------------------------------------------------------------
// Browser-side setup: IPC mock and a visible fake cursor.
// ---------------------------------------------------------------------------------------------

function browserSetup() {
  // Tauri IPC mock — mirrors the Rust commands closely enough for a demo.
  const M = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sind: (x) => Math.sin((x * Math.PI) / 180),
    cosd: (x) => Math.cos((x * Math.PI) / 180),
    tand: (x) => Math.tan((x * Math.PI) / 180),
    asind: (x) => (Math.asin(x) * 180) / Math.PI,
    acosd: (x) => (Math.acos(x) * 180) / Math.PI,
    atand: (x) => (Math.atan(x) * 180) / Math.PI,
    log: Math.log10,
    ln: Math.log,
    sqrt: Math.sqrt,
    abs: Math.abs,
    factorial: (n) => {
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
    pi: Math.PI,
    e: Math.E,
  };
  const evaluate = (expression) => {
    const js = String(expression)
      .replace(/\^/g, "**")
      .replace(/[a-z]+/gi, (name) => {
        if (!(name in M)) throw `Unknown identifier: ${name}`;
        return `M.${name}`;
      });
    const value = Function("M", `"use strict"; return (${js});`)(M);
    if (typeof value !== "number" || !Number.isFinite(value)) throw "Math Error";
    return String(Number.parseFloat(value.toPrecision(12)));
  };
  let cpu = 18;
  let ram = 6.2e9;
  window.__TAURI_INTERNALS__ = {
    transformCallback: () => 0,
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main", windowLabel: "main" },
    },
    invoke: async (cmd, args) => {
      if (cmd === "evaluate") return evaluate(args.expression);
      if (cmd === "get_history") return [];
      if (cmd === "get_system_info") {
        cpu = Math.min(95, Math.max(4, cpu + (Math.random() - 0.45) * 14));
        ram = Math.min(11e9, Math.max(5e9, ram + (Math.random() - 0.5) * 4e8));
        return {
          cpu_usage: cpu,
          cpu_cores: 16,
          ram_used: ram,
          ram_total: 32e9,
          swap_used: 2.1e8,
          swap_total: 8e9,
          net_rx: Math.random() * 2.4e6,
          net_tx: Math.random() * 3e5,
          os_name: "Arch Linux",
          kernel: "6.18.55-1-lts",
          uptime: 3 * 3600 + 1420,
        };
      }
      return null;
    },
  };

  // Demo data: business details for exported quotes.
  localStorage.setItem(
    "archcalc_quote_settings",
    JSON.stringify({
      businessName: "Maniac Prints",
      contact: "3D printing studio · hello@example.com",
      currency: "INR",
      templateId: "classic",
      defaultTaxPercent: 18,
    }),
  );

  const css = `
    #__sc-cursor { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 22px; height: 22px;
      pointer-events: none; transform: translate(-3px, -2px); transition: transform 80ms; filter: drop-shadow(0 2px 3px rgba(0,0,0,.5)); }
    #__sc-cursor.down { transform: translate(-3px, -2px) scale(.85); }
    .__sc-ripple { position: fixed; z-index: 2147483646; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
      border: 2px solid rgba(79,140,255,.9); pointer-events: none; animation: __sc-ripple 450ms ease-out forwards; }
    @keyframes __sc-ripple { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
    .__sc-clean #__sc-cursor, .__sc-clean .__sc-ripple { visibility: hidden; }`;

  const arrow = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 8.5-6.6 1.6L9.3 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // The cursor lives on <html> so app styles never affect it.
    const root = document.documentElement;
    const cursor = document.createElement("div");
    cursor.id = "__sc-cursor";
    cursor.innerHTML = arrow;
    root.appendChild(cursor);
    window.addEventListener(
      "mousemove",
      (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      },
      true,
    );
    window.addEventListener(
      "mousedown",
      (e) => {
        cursor.classList.add("down");
        const ripple = document.createElement("div");
        ripple.className = "__sc-ripple";
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        root.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
      },
      true,
    );
    window.addEventListener("mouseup", () => cursor.classList.remove("down"), true);

  });

}

// ---------------------------------------------------------------------------------------------
// Screencast recorder
// ---------------------------------------------------------------------------------------------

async function startRecorder(page, frameDir) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(frameDir, `f${String(frames.length).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId });
    } catch {
      // Session closed while acknowledging the last frame.
    }
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 95,
    maxWidth: Math.round(cfg.width * cfg.dpr),
    maxHeight: Math.round(cfg.height * cfg.dpr),
    everyNthFrame: 1,
  });
  return {
    frames,
    async stop() {
      const end = Date.now() / 1000;
      await cdp.send("Page.stopScreencast");
      return end;
    },
  };
}

/** Turn variable-rate screencast frames into a constant 30 fps H.264 file. */
function encodeFrames(frames, endTime, startTime, outFile) {
  const usable = frames.filter((f) => f.t >= startTime - 0.05);
  const list = [];
  for (let i = 0; i < usable.length; i++) {
    const next = i + 1 < usable.length ? usable[i + 1].t : endTime;
    list.push(`file '${usable[i].file}'`, `duration ${Math.max(0.001, next - usable[i].t).toFixed(4)}`);
  }
  list.push(`file '${usable.at(-1).file}'`);
  const listFile = path.join(path.dirname(usable[0].file), "frames.txt");
  fs.writeFileSync(listFile, list.join("\n"));
  const { width, height } = cfg;
  ffmpeg(
    "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", `fps=30,scale=${width}:${height}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-movflags", "+faststart", outFile,
  );
}

// ---------------------------------------------------------------------------------------------
// The tour
// ---------------------------------------------------------------------------------------------

async function tour(page, marks) {
  const wait = (ms) => page.waitForTimeout(ms);
  const now = () => Date.now() / 1000;
  const section = async (name, fn) => {
    const start = now();
    await fn();
    marks.push({ name, start, end: now() });
  };
  /** Save a clean screenshot (no cursor) for the documentation pages. */
  const shot = async (name) => {
    await page.evaluate(() => document.documentElement.classList.add("__sc-clean"));
    await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
    await page.evaluate(() => document.documentElement.classList.remove("__sc-clean"));
  };

  let mouse = { x: cfg.width / 2, y: cfg.height / 2 };
  const moveTo = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error("element not visible");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const dist = Math.hypot(x - mouse.x, y - mouse.y);
    await page.mouse.move(x, y, { steps: Math.max(8, Math.round(dist / 18)) });
    mouse = { x, y };
  };
  const click = async (locator, after = 350) => {
    await moveTo(locator);
    await page.mouse.down();
    await page.mouse.up();
    await wait(after);
  };
  const type = async (text, delay = 45) => {
    await page.keyboard.type(text, { delay });
  };
  const nav = (label) => click(page.locator("nav a", { hasText: label }), 700);
  const key = (label) =>
    page.locator("main button").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first();

  await page.mouse.move(mouse.x, mouse.y);

  await section("dashboard", async () => {
    await wait(900);
    const box = page.getByPlaceholder("Type a calculation, conversion or command...");
    await click(box);
    await type("(85000 - 22000) * 12");
    await wait(1400);
    await page.keyboard.press("Enter");
    await wait(600);
    for (const q of ["5 km to mi", "18% of 4999", "sha256 ArchCalc"]) {
      await page.keyboard.press("Control+A");
      await type(q);
      await wait(1500);
      await page.keyboard.press("Enter");
      await wait(400);
    }
    await page.keyboard.press("Control+A");
    await type("(85000 - 22000) * 12");
    await wait(900);
    await shot("dashboard");
  });

  await section("calculator", async () => {
    await nav("Calculator");
    await wait(500);
    for (const k of ["1", "2", "8"]) await click(key(k), 180);
    await page.keyboard.type("*");
    await wait(250);
    await click(key("4"), 180);
    await page.keyboard.type("+");
    await wait(250);
    await click(key("√"), 200);
    for (const k of ["1", "4", "4"]) await click(key(k), 180);
    await click(key(")"), 250);
    await page.keyboard.press("Enter");
    await wait(1300);
    await click(page.locator("main button").filter({ has: page.locator("svg.lucide-rotate-ccw") }).first(), 300);
    await click(page.locator("main button", { hasText: /^(RAD|DEG)$/ }).first(), 500);
    await click(key("sin"), 200);
    for (const k of ["3", "0"]) await click(key(k), 180);
    await click(key(")"), 250);
    await page.keyboard.press("Enter");
    await wait(1400);
    await page.mouse.wheel(0, -800);
    await wait(400);
    await shot("calculator");
  });

  await section("history", async () => {
    await nav("History");
    await wait(900);
    await click(page.getByPlaceholder("Search history..."));
    await type("km");
    await wait(1500);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await wait(300);
    await shot("history");
  });

  await section("workspaces", async () => {
    await nav("Workspaces");
    await wait(600);
    const editor = page.locator("textarea").first();
    await click(editor);
    await page.keyboard.press("Control+A");
    await type(
      "salary = 85000\nrent = 22000\nfood = 9000\nsip = salary * 15%\n// what's left each month\nleft = salary - rent - food - sip\nleft * 12",
      38,
    );
    await wait(2000);
    await shot("workspaces");
  });

  await section("converters", async () => {
    await nav("Converters");
    await wait(500);
    const value = page.locator('main input[inputmode="decimal"]').first();
    await click(value);
    await page.keyboard.press("Control+A");
    await type("42.195");
    await wait(1100);
    for (const cat of ["Temperature", "Storage"]) {
      await click(page.locator("main button", { hasText: cat }), 500);
      await click(value);
      await page.keyboard.press("Control+A");
      await type(cat === "Temperature" ? "37" : "1024");
      await wait(1000);
    }
    await shot("converters");
  });

  await section("devtools", async () => {
    await nav("Developer Tools");
    await wait(1000);
    await shot("devtools");
    await click(page.getByText("JSON Formatter", { exact: true }), 500);
    await click(page.getByPlaceholder("Paste JSON here..."));
    await type('{"app":"ArchCalc","stack":["Rust","Tauri","SolidJS"],"fast":true}', 18);
    await wait(1600);
    await shot("devtools-json");
    await click(page.locator("main button").filter({ has: page.locator("svg.lucide-arrow-left") }).first(), 400);
    await click(page.getByText("Hash Generator", { exact: true }), 500);
    await click(page.locator("main textarea, main input[type=text]").first());
    await type("hello archcalc", 40);
    await wait(700);
    await click(page.locator("main button", { hasText: /^SHA512$/ }), 1100);
  });

  await section("system", async () => {
    await nav("System");
    await wait(4200);
    await shot("system");
  });

  await section("quote-studio", async () => {
    await nav("Quote Studio");
    await wait(1600);
    await shot("quote-studio");
    await click(page.getByText("3D Print Costing"), 600);
    await click(page.getByPlaceholder("Product name, e.g. Dragon keychain"));
    await type("Dragon keychain");
    await click(page.getByRole("button", { name: "Create" }), 900);

    const field = (label) => page.locator("label", { hasText: label }).locator("input").first();
    await click(page.getByLabel("Filament 1 Used per plate"));
    await page.keyboard.press("Control+A");
    await type("72");
    await wait(500);
    await click(page.getByRole("button", { name: "Add filament" }), 500);
    await click(page.getByLabel("Filament name").last());
    await page.keyboard.press("Control+A");
    await type("Silk Gold");
    await click(page.getByLabel("Filament 2 Spool price"));
    await page.keyboard.press("Control+A");
    await type("1600");
    await click(page.getByLabel("Filament 2 Used per plate"));
    await page.keyboard.press("Control+A");
    await type("24");
    await wait(900);
    await shot("quote-filaments");
    await click(field("Items per plate"));
    await page.keyboard.press("Control+A");
    await type("6");
    await wait(900);

    await click(page.getByRole("button", { name: "Add material" }), 400);
    await click(page.getByLabel("Material name").last());
    await type("Magnet");
    await click(page.getByLabel("Unit cost").last());
    await page.keyboard.press("Control+A");
    await type("3");
    await click(page.getByLabel("Quantity", { exact: true }).last());
    await page.keyboard.press("Control+A");
    await type("2");
    await wait(700);

    const profit = page.locator("label", { hasText: "Profit method" }).locator("select");
    await moveTo(profit);
    await profit.selectOption("margin");
    await wait(500);
    await click(
      page
        .locator("label")
        .filter({ has: page.locator("span", { hasText: /^Profit$/ }) })
        .locator("input")
        .first(),
    );
    await page.keyboard.press("Control+A");
    await type("45");
    await wait(1200);
    await shot("quote-editor");
    const plates = page
      .locator("label")
      .filter({ has: page.locator("span", { hasText: /^Plates$/ }) })
      .locator("input")
      .first();
    await click(page.getByRole("button", { name: "Simple", exact: true }), 900);
    await page
      .locator("section", { hasText: "Values that apply to the whole quote." })
      .evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    await wait(900);
    await click(plates);
    await page.keyboard.press("Control+A");
    await type("3");
    await wait(1200);
    await shot("quote-simple");
    await click(plates);
    await page.keyboard.press("Control+A");
    await type("1");
    await click(page.getByRole("button", { name: "Detailed", exact: true }), 700);

    await click(page.getByLabel("Quote name"));
    await page.keyboard.press("Control+A");
    await type("PLA Basic");
    await click(page.getByRole("button", { name: "Duplicate" }), 600);
    await click(page.getByLabel("Quote name"));
    await page.keyboard.press("Control+A");
    await type("PETG");
    await click(page.getByLabel("Filament 1 Spool price"));
    await page.keyboard.press("Control+A");
    await type("1650");
    await wait(900);
    await click(page.getByRole("button", { name: "Dragon keychain" }), 1600);
    await shot("quote-list");
    await click(page.getByRole("button", { name: "Compare" }), 2200);
    await shot("quote-compare");
    await click(page.getByRole("button", { name: "PLA Basic" }).first(), 700);

    await click(page.getByLabel("Notes", { exact: true }));
    await type(
      "Printed in **matte PLA** with a _gift box_.\n- Sanded supports\n- Custom colours on request",
      26,
    );
    await wait(500);
    await click(page.getByRole("button", { name: "Terms", exact: true }), 700);
    await click(page.getByRole("button", { name: "Preview" }).first(), 600);
    await page
      .locator("section", { hasText: "Notes & terms" })
      .evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    await wait(1400);
    await shot("quote-notes");

    await click(page.getByRole("button", { name: "Export quote" }), 1200);
    for (const t of ["Sunset", "Emerald", "Classic Navy"]) {
      await click(page.getByRole("button", { name: t }), 1000);
      if (t === "Sunset") await shot("quote-export");
    }
    await click(page.getByRole("button", { name: "Spreadsheet" }), 1500);
    await shot("quote-spreadsheet");
    await moveTo(page.locator("table").last());
    await page.mouse.wheel(0, 700);
    await wait(1600);
    await click(page.getByRole("button", { name: "Document" }), 600);
    await click(page.getByText("×", { exact: true }), 600);
    await click(page.getByRole("button", { name: "All products" }), 1600);
    await shot("quote-products");
  });

  await section("settings", async () => {
    await nav("Settings");
    await wait(700);
    await click(page.getByRole("button", { name: "Keyboard Shortcuts" }), 1200);
    await click(page.getByRole("button", { name: "Data" }), 1100);
    await shot("settings");
  });
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const server = await createServer({
  root: appDir,
  logLevel: "error",
  server: { port: 5199, strictPort: false },
});
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: cfg.width, height: cfg.height },
  deviceScaleFactor: cfg.dpr,
});
await context.addInitScript(browserSetup);
const page = await context.newPage();
page.on("pageerror", (e) => console.error("[page error]", e.message));

// Warm up so lazily loaded chunks (pdfmake, apexcharts) don't stall the recording.
await page.goto(url);
await page.waitForTimeout(1200);
await page.goto(`${url}quotes`);
await page.waitForTimeout(400);
await page.goto(url);
await page.waitForTimeout(1500);

fs.mkdirSync(screenshotDir, { recursive: true });
const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), "archcalc-frames-"));
const recorder = await startRecorder(page, frameDir);
await page.waitForTimeout(300);
const startTime = Date.now() / 1000;
const marks = [];

await tour(page, marks);
await page.waitForTimeout(400);
const endTime = await recorder.stop();
await browser.close();
await server.close();

console.log(`captured ${recorder.frames.length} frames over ${(endTime - startTime).toFixed(1)}s`);

const videoDir = path.join(repoDir, "web", "public", "videos");
fs.mkdirSync(videoDir, { recursive: true });
const full = path.join(videoDir, "archcalc-showcase.mp4");
encodeFrames(recorder.frames, endTime, startTime, full);
ffmpeg(
  "-i", full, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1",
  "-deadline", "good", "-cpu-used", "4", "-an",
  path.join(videoDir, "archcalc-showcase.webm"),
);
const at = (t) => (t - startTime).toFixed(2);
const quotes = marks.find((m) => m.name === "quote-studio");
ffmpeg("-ss", at(quotes.start + 9), "-i", full, "-frames:v", "1", "-q:v", "3", path.join(videoDir, "archcalc-showcase-poster.jpg"));
for (const m of marks) {
  ffmpeg(
    "-ss", at(m.start), "-to", at(m.end + 0.4), "-i", full,
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", "-an",
    path.join(videoDir, `clip-${m.name}.mp4`),
  );
}
fs.writeFileSync(
  path.join(videoDir, "chapters.json"),
  `${JSON.stringify(
    marks.map((m) => ({ name: m.name, start: Number(at(m.start)), end: Number(at(m.end)) })),
    null,
    2,
  )}\n`,
);
console.log(`wrote videos to ${videoDir}`);

fs.rmSync(frameDir, { recursive: true, force: true });
