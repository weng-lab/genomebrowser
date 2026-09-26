import assert from "node:assert/strict";

export async function dynseq({ browser, evaluate, requests, origin }) {
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
  await browser("open", origin);
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
}
