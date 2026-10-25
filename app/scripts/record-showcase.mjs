#!/usr/bin/env node
/**
 * Records the ArchCalc showcase videos.
 *
 * Runs the Vite frontend in headless Chromium with the Tauri IPC layer mocked, drives a scripted
 * tour of every feature, captures frames through the Chrome DevTools screencast (much sharper than
 * Playwright's built-in recorder), and encodes them with ffmpeg.
 *
 *   node scripts/record-showcase.mjs docs                 → web/public/videos (full tour, clips, poster)
 *   node scripts/record-showcase.mjs linkedin [out.mp4]   → 1080p cut with intro, captions and outro
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
const mode = process.argv[2] === "linkedin" ? "linkedin" : "docs";

const MODES = {
  // CSS viewport × deviceScaleFactor = captured frame size.
  docs: { width: 1280, height: 800, dpr: 1.5, out: { width: 1280, height: 800 }, pace: 1 },
  linkedin: { width: 1600, height: 900, dpr: 1.2, out: { width: 1920, height: 1080 }, pace: 1.25 },
};
const cfg = MODES[mode];

const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });

// ---------------------------------------------------------------------------------------------
// Browser-side setup: IPC mock, fake cursor, captions and title cards.
// ---------------------------------------------------------------------------------------------

function browserSetup({ framed }) {
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
    #__sc-caption { position: fixed; z-index: 2147483645; left: 50%; bottom: ${framed ? "18px" : "22px"}; transform: translate(-50%, 16px);
      opacity: 0; transition: opacity 350ms, transform 350ms; pointer-events: none; display: flex; align-items: center; gap: 14px;
      padding: ${framed ? "12px 22px" : "9px 18px"}; border-radius: 999px; background: rgba(11,15,20,.82); backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,.12); box-shadow: 0 12px 40px rgba(0,0,0,.45); font-family: Inter, system-ui, sans-serif; white-space: nowrap; }
    #__sc-caption.show { opacity: 1; transform: translate(-50%, 0); }
    #__sc-caption .dot { width: 10px; height: 10px; border-radius: 50%; background: #4F8CFF; box-shadow: 0 0 12px #4F8CFF; }
    #__sc-caption .title { color: #fff; font-weight: 650; font-size: ${framed ? "19px" : "15px"}; }
    #__sc-caption .sub { color: #9CA3AF; font-size: ${framed ? "16px" : "13px"}; }
    #__sc-caption .badge { color: #0B0F14; background: #4F8CFF; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 999px; letter-spacing: .06em; }
    .__sc-card-on #__sc-cursor, .__sc-clean #__sc-cursor, .__sc-clean #__sc-caption, .__sc-clean .__sc-ripple { visibility: hidden; }
    #__sc-card { position: fixed; inset: 0; z-index: 2147483640; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 22px; background: radial-gradient(1200px 600px at 50% 40%, #16233d 0%, #0B0F14 60%); color: #fff; opacity: 0;
      transition: opacity 600ms; pointer-events: none; font-family: Inter, system-ui, sans-serif; text-align: center; }
    #__sc-card.show { opacity: 1; }
    #__sc-card .logo { width: 84px; height: 84px; border-radius: 22px; background: linear-gradient(135deg, #4F8CFF, #8B5CF6);
      display: flex; align-items: center; justify-content: center; font-size: 44px; font-weight: 800; box-shadow: 0 20px 60px rgba(79,140,255,.35); }
    #__sc-card h1 { font-size: 64px; font-weight: 800; letter-spacing: -.03em; margin: 0; }
    #__sc-card p { font-size: 24px; color: #9CA3AF; margin: 0; max-width: 900px; line-height: 1.4; }
    #__sc-card .chips { display: flex; gap: 10px; margin-top: 6px; }
    #__sc-card .chips span { padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05);
      font-size: 17px; color: #E5E7EB; }
    ${
      framed
        ? `html { background: radial-gradient(1400px 700px at 20% 0%, #1d2b4f 0%, #0B0F14 55%), #0B0F14 !important; height: 100%; overflow: hidden; }
           body { transform: scale(.86); transform-origin: 50% 42%; border-radius: 14px; overflow: hidden;
             box-shadow: 0 30px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08); }`
        : ""
    }`;

  const arrow = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 8.5-6.6 1.6L9.3 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Overlays live on <html>, outside the (possibly scaled) <body>.
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

    const caption = document.createElement("div");
    caption.id = "__sc-caption";
    root.appendChild(caption);
    const card = document.createElement("div");
    card.id = "__sc-card";
    root.appendChild(card);
  });

  window.__sc = {
    caption(title, sub, badge) {
      const el = document.getElementById("__sc-caption");
      if (!el) return;
      if (!title) {
        el.classList.remove("show");
        return;
      }
      el.innerHTML = `${badge ? `<span class="badge">${badge}</span>` : '<span class="dot"></span>'}<span class="title">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ""}`;
      el.classList.add("show");
    },
    card(html) {
      const el = document.getElementById("__sc-card");
      if (!el) return;
      document.documentElement.classList.toggle("__sc-card-on", Boolean(html));
      if (html) {
        el.innerHTML = html;
        el.classList.add("show");
      } else {
        el.classList.remove("show");
      }
    },
  };
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
  const { width, height } = cfg.out;
  ffmpeg(
    "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", `fps=30,scale=${width}:${height}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", mode === "linkedin" ? "16" : "18",
    "-movflags", "+faststart", outFile,
  );
}

// ---------------------------------------------------------------------------------------------
// The tour
// ---------------------------------------------------------------------------------------------

/** Clicks and caption changes, used to sync sound effects in the LinkedIn cut. */
const events = [];

async function tour(page, marks) {
  const pace = cfg.pace;
  const wait = (ms) => page.waitForTimeout(ms * pace);
  const now = () => Date.now() / 1000;
  const section = async (name, fn) => {
    const start = now();
    await fn();
    marks.push({ name, start, end: now() });
  };
  // Captions are for the LinkedIn cut; the docs pages explain each clip in text instead.
  const caption = (title, sub, badge) => {
    if (mode !== "linkedin") return Promise.resolve();
    if (title) events.push({ type: "caption", t: Date.now() / 1000 });
    return page.evaluate(([t, s, b]) => window.__sc.caption(t, s, b), [title, sub, badge]);
  };
  /** Docs mode: save a clean screenshot (no cursor or caption) for the documentation pages. */
  const shot = async (name) => {
    if (mode !== "docs") return;
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
    events.push({ type: "click", t: Date.now() / 1000 });
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
    await caption("Command bar", "maths, unit conversions & dev commands in one box");
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
    await caption("Scientific calculator", "parsed & evaluated by a custom Rust AST engine");
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
    await caption("Persistent history", "every result, searchable");
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
    await caption("Workspaces", "notepad-style sheets with variables & live results");
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
    await caption("Unit converters", "length, weight, temperature & storage");
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
    await caption("Developer tools", "hashes, UUIDs, Base64, JSON, binary & hex");
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
    await type("hello linkedin", 40);
    await wait(700);
    await click(page.locator("main button", { hasText: /^SHA512$/ }), 1100);
  });

  await section("system", async () => {
    await nav("System");
    await caption("System monitor", "live CPU, memory & network");
    await wait(4200);
    await shot("system");
  });

  await section("quote-studio", async () => {
    await nav("Quote Studio");
    await caption("Quote Studio", "cost & quote builders for everyday work", "NEW");
    await wait(1600);
    await shot("quote-studio");
    await click(page.getByText("3D Print Costing"), 600);
    await click(page.getByPlaceholder("Product name, e.g. Dragon keychain"));
    await type("Dragon keychain");
    await click(page.getByRole("button", { name: "Create" }), 900);

    await caption("3D print costing", "filament per plate ÷ items, power, failures, materials, margin");
    const field = (label) => page.locator("label", { hasText: label }).locator("input").first();
    await click(field("Filament used per plate"));
    await page.keyboard.press("Control+A");
    await type("96");
    await wait(700);
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
    await click(page.getByLabel("Quantity").last());
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

    await caption("Save quotes per material", "duplicate, tweak and compare side by side");
    await click(page.getByLabel("Quote name"));
    await page.keyboard.press("Control+A");
    await type("PLA Basic");
    await click(page.getByRole("button", { name: "Duplicate" }), 600);
    await click(page.getByLabel("Quote name"));
    await page.keyboard.press("Control+A");
    await type("PETG");
    await click(field("Spool price"));
    await page.keyboard.press("Control+A");
    await type("1650");
    await wait(900);
    await click(page.getByRole("button", { name: "Compare" }), 2200);
    await shot("quote-compare");
    await click(page.getByRole("button", { name: "PLA Basic" }).first(), 700);

    await caption("Export to PDF, Word or Markdown", "five templates with a live preview");
    await click(page.getByRole("button", { name: "Export quote" }), 1200);
    for (const t of ["Sunset", "Emerald", "Midnight", "Classic Navy"]) {
      await click(page.getByRole("button", { name: t }), 1000);
      if (t === "Sunset") await shot("quote-export");
    }
    await click(page.getByText("×", { exact: true }), 600);
  });

  await section("settings", async () => {
    await nav("Settings");
    await caption("Settings", "export, import & keyboard shortcuts");
    await wait(700);
    await click(page.getByRole("button", { name: "Keyboard Shortcuts" }), 1200);
    await click(page.getByRole("button", { name: "Data" }), 1100);
    await shot("settings");
  });

  await caption(null);
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
await context.addInitScript(browserSetup, { framed: mode === "linkedin" });
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
let appStart = startTime;
let appEnd = startTime;

const card = (html, ms) =>
  page.evaluate(([h]) => window.__sc.card(h), [html]).then(() => page.waitForTimeout(ms));

if (mode === "linkedin") {
  await card(
    `<div class="logo">Λ</div><h1>ArchCalc</h1>
     <p>A blazing-fast desktop calculator & everyday toolkit</p>
     <div class="chips"><span>🦀 Rust</span><span>⚡ Tauri</span><span>◆ SolidJS</span></div>`,
    3600,
  );
  appStart = Date.now() / 1000;
  await card(null, 700);
}

await tour(page, marks);

if (mode === "linkedin") {
  appEnd = Date.now() / 1000;
  await card(
    `<div class="logo">Λ</div><h1>ArchCalc</h1>
     <p>Open source · Linux & Windows<br/>github.com/murtazapatel89100/ArchCalc</p>`,
    4200,
  );
}
await page.waitForTimeout(400);
const endTime = await recorder.stop();
await browser.close();
await server.close();

console.log(`captured ${recorder.frames.length} frames over ${(endTime - startTime).toFixed(1)}s`);

if (mode === "linkedin") {
  const out = path.resolve(process.argv[3] ?? path.join(os.homedir(), "Downloads", "archcalc-linkedin-showcase.mp4"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const silent = path.join(frameDir, "silent.mp4");
  encodeFrames(recorder.frames, endTime, startTime, silent);

  // Original synthesized soundtrack, synced to clicks and captions.
  const rel = (t) => Number((t - startTime).toFixed(3));
  const eventsFile = path.join(frameDir, "events.json");
  fs.writeFileSync(
    eventsFile,
    JSON.stringify({
      duration: rel(endTime),
      appStart: rel(appStart),
      appEnd: rel(appEnd),
      events: events.map((e) => ({ type: e.type, t: rel(e.t) })),
    }),
  );
  const wav = path.join(frameDir, "soundtrack.wav");
  execFileSync("python3", [path.join(appDir, "scripts", "showcase-audio.py"), eventsFile, wav], {
    stdio: "inherit",
  });
  ffmpeg(
    "-i", silent, "-i", wav,
    "-af", "aecho=0.8:0.6:70|140:0.16|0.08,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
    "-movflags", "+faststart", out,
  );
  console.log(`wrote ${out}`);
} else {
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
}

fs.rmSync(frameDir, { recursive: true, force: true });
