/**
 * Visual-pass helper: screenshot key stages of the running dev server so we can
 * eyeball rendering (markdown tables/lists, definition chips, the notation
 * rollup, and the interactive visualizations). Run the dev server first.
 *
 *   node scripts/screenshots.mjs            # uses http://localhost:5173
 *
 * Output PNGs go to scripts/shots/.
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = join(process.cwd(), "scripts", "shots");
mkdirSync(OUT, { recursive: true });

// [route, name, optional expand-the-panels?]
const SHOTS = [
  ["", "home-skilltree", false],      // skill-tree edge routing + labels
  ["stage-1", "stage1-concepts", true], // concept panel (ADR-0002) + chips
  ["stage-2", "stage2-graph", false], // typed-graph edge routing fix
  ["stage-3", "stage3-defs", true],   // inline chips + notation rollup
  ["stage-6", "stage6-table", false], // markdown pipe table
  ["stage-11", "stage11-lists", false], // bullet lists
  ["stage-0", "stage0-table", false], // comparison-table viz
  ["stage-12", "stage12-encoder", false], // coding encoder
  ["stage-14", "stage14-loop", false], // godel loop
];

const browser = await puppeteer.launch({
  headless: "new",
  protocolTimeout: 120000,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage", // WSL/container: /dev/shm too small → screenshot hangs
    "--disable-gpu",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1400, deviceScaleFactor: 1 });

for (const [route, name, expand] of SHOTS) {
  try {
    await page.goto(`${BASE}/#/${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500)); // let KaTeX/React Flow settle

    if (expand) {
      // open the per-stage concept + notation rollups and the first inline chip
      await page.evaluate(() => {
        for (const sel of ["details.concept-panel", "details.notation-panel"]) {
          const d = document.querySelector(sel);
          if (d) d.open = true;
        }
      }).catch(() => {});
      const chip = await page.$(".def-chip-trigger");
      if (chip) await chip.click().catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
    }

    const file = join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`shot ${name} -> ${file}`);
  } catch (e) {
    console.error(`FAILED ${name}: ${e.message?.split("\n")[0]}`);
  }
}

await browser.close();
console.log("done");
