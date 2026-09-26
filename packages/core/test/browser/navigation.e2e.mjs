import assert from "node:assert/strict";

// Core owns navigation. The shared runner supplies a real first-party track so
// hit testing, pointer capture, overscan and the public region subscription run together.
export async function navigation({ browser, evaluate, origin }) {
  await browser("open", `${origin}/foundation.html`);
  await browser(
    "wait",
    "--fn",
    `(() => {
    const path = document.querySelector('#browser path[fill="#2266aa"]');
    return path && path.getBBox().height > 0 && !document.querySelector('[role="progressbar"]');
  })()`,
  );
  const region = () => evaluate('document.querySelector("output").textContent');
  assert.equal(await region(), "chr1:190-790");
  const start = await evaluate(`(() => {
    const section = document.querySelector('#browser').getBoundingClientRect();
    const plot = document.querySelector('#browser rect[fill="transparent"][pointer-events="none"]').getBoundingClientRect();
    return { x: section.left + 400, y: plot.top + 80 };
  })()`);
  await browser("mouse", "move", String(start.x), String(start.y));
  await browser("mouse", "down", "left");
  await browser("mouse", "move", String(start.x - 120), String(start.y));
  await browser("mouse", "up", "left");
  // 120 screen pixels across a 600px plot spanning 600 bases pans forward 120 bases.
  await browser("wait", "--fn", 'document.querySelector("output").textContent === "chr1:310-910"');
  assert.equal(
    await region(),
    "chr1:310-910",
    "Pointer pan must commit through the public browser store",
  );
}
