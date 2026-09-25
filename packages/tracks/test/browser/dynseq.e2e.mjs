import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const run = promisify(execFile);
const session = `dynseq-e2e-${process.pid}`;
const root = fileURLToPath(new URL(".", import.meta.url));
const requests = [];
const scores = await readFile(
  new URL("../../../reader/test/fixtures/bigwig/basic.bw", import.meta.url),
);
// A real 2bit file: TCAG repeated over chr1, with the scored [200,260) block soft-masked.
const reference = Buffer.alloc(49 + 3000, 0);
reference.writeUInt32LE(0x1a412743, 0);
reference.writeUInt32LE(1, 8);
reference[16] = 4;
reference.write("chr1", 17);
reference.writeUInt32LE(25, 21);
reference.writeUInt32LE(12000, 25);
reference.writeUInt32LE(1, 33);
reference.writeUInt32LE(200, 37);
reference.writeUInt32LE(60, 41);
// dnaSize, nBlockCount, maskBlockCount, maskStart, maskSize, reserved = 24 bytes.
reference.fill(0x1b, 49);
const server = await createServer({
  configFile: false,
  root,
  plugins: [
    react(),
    {
      name: "genomic-fixtures",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!["/scores.bw", "/reference.2bit", "/broken.2bit"].includes(req.url)) return next();
          requests.push(req.url);
          if (req.url === "/broken.2bit") {
            res.statusCode = 404;
            res.end();
            return;
          }
          const bytes = req.url === "/scores.bw" ? scores : reference;
          const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? "");
          assert.ok(match, "Reader must use HTTP range requests");
          const start = Number(match[1]);
          const end = Math.min(Number(match[2]), bytes.length - 1);
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
            "Content-Type": "application/octet-stream",
          });
          res.end(bytes.subarray(start, end + 1));
        });
      },
    },
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    alias: {
      "@weng-lab/genomebrowser": fileURLToPath(
        new URL("../../../core/src/lib.ts", import.meta.url),
      ),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [fileURLToPath(new URL("../../../..", import.meta.url))] },
  },
});
async function browser(...args) {
  const { stdout } = await run("agent-browser", ["--session", session, "--json", ...args], {
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(stdout);
  assert.equal(result.success, true, stdout);
  return result.data;
}
async function evaluate(source) {
  return (await browser("eval", source)).result;
}
async function click(name) {
  await browser("find", "role", "button", "click", "--name", name, "--exact");
}
const glyphSelector = '#dynseq g[transform*="scale("] > path';
async function letters(present) {
  await browser(
    "wait",
    "--fn",
    `${present ? "" : "!"}document.querySelector('${glyphSelector}') && !document.querySelector('#dynseq [role="progressbar"]')`,
  );
}
async function sameSignal() {
  // Compare scientific SVG paths, including clamp indicators, independently of generated IDs.
  await browser(
    "wait",
    "--fn",
    `(() => {
    const plot = id => document.querySelector(id + ' rect[fill="transparent"][pointer-events="none"]')?.parentElement;
    const a = plot('#dynseq'), b = plot('#bigwig');
    return a && b && a.innerHTML === b.innerHTML && !document.querySelector('${glyphSelector}');
  })()`,
  );
}
try {
  await server.listen();
  const address = server.httpServer.address();
  await browser("open", `http://127.0.0.1:${address.port}`);
  await sameSignal();
  assert.equal(
    requests.filter((url) => url.endsWith(".2bit")).length,
    0,
    "Wide signal must not request sequence",
  );
  await click("Sequence");
  await letters(true);
  assert.ok(requests.includes("/reference.2bit"));
  const geometry = await evaluate(`(() => {
    const glyph = document.querySelector('${glyphSelector}').parentElement;
    const cell = glyph.parentElement.querySelector('rect');
    return { height: glyph.transform.baseVal.consolidate().matrix.d * 100, width: Number(cell.getAttribute('width')), viewport: document.querySelector('#dynseq').getBoundingClientRect().width };
  })()`);
  assert.ok(
    Math.abs(geometry.width - (geometry.viewport - 100) / 100) < 0.1,
    "Sparse glyphs occupy one genomic base",
  );
  assert.ok(
    Math.abs(geometry.height - 80) < 0.001,
    "Offscreen outliers must not flatten visible letters",
  );
  await click("Clamp");
  await click("Hide letters");
  await letters(false);
  await sameSignal();
  await click("Show letters");
  await letters(true);
  await click("Require wider letters");
  await letters(false);
  await sameSignal();
  await click("Default letters");
  await letters(true);
  await click("Narrow");
  await letters(false);
  await sameSignal();
  await click("Expand");
  await letters(true);
  await click("Negative");
  await letters(true);
  const hover = await evaluate(`(() => {
    const section = document.querySelector('#dynseq').getBoundingClientRect();
    const cells = [...document.querySelectorAll('${glyphSelector}')].map(path => path.parentElement.parentElement.querySelector('rect'));
    const cell = cells.find(cell => { const r = cell.getBoundingClientRect(); return r.left > section.left + 100 && r.right < section.right; });
    const rect = cell.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await browser("mouse", "move", String(Math.round(hover.x)), String(Math.round(hover.y)));
  await browser("wait", "--text", "Score");
  await browser("wait", "--text", "-8.0000");
  await click("Dense");
  await letters(false);
  await sameSignal();
  await click("Break reference");
  await sameSignal();
  assert.ok(!requests.includes("/broken.2bit"), "Dense display must not request reference");
  await click("Wide");
  await click("Full");
  await sameSignal();
  assert.ok(!requests.includes("/broken.2bit"), "Wide full display must not request reference");
  await browser("click", '#dynseq [aria-label="Settings for Signal"]');
  await browser("wait", "--text", "Y-axis range");
  const settings = await browser("snapshot", "-i");
  assert.match(settings.snapshot, /Minimum pixels per base/);
  assert.match(settings.snapshot, /Fill missing values with zero/);
  assert.match(settings.snapshot, /Show clamp indicators/);
  assert.match(settings.snapshot, /Scores BigWig URL/);
  console.log(
    "PASS: BigWig parity, sequence zoom, sparse glyph widths, thresholds, resize, negative scores, dense display, and reference independence",
  );
} finally {
  await browser("close").catch(() => {});
  await server.close();
}
