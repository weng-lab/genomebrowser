import assert from "node:assert/strict";

// Observe the scientific drawing, not a snapshot of SVG serialization. Screen-space
// samples also exercise the browser's real transforms and the module's y scale.
export async function bigwig({ browser, evaluate, origin }) {
  await browser("open", `${origin}/foundation.html`);
  await browser(
    "wait",
    "--fn",
    `(() => {
    const path = document.querySelector('#browser path[fill="#2266aa"]');
    return path && path.getBBox().height > 0 && !document.querySelector('[role="progressbar"]');
  })()`,
  );
  assert.equal(
    await evaluate(
      `document.querySelector('#browser path[fill="#2266aa"]').checkVisibility({ opacityProperty: true, visibilityProperty: true })`,
    ),
    true,
    "Signal must be visible",
  );
  const samples = await evaluate(`(() => {
    const section = document.querySelector('#browser').getBoundingClientRect();
    const path = document.querySelector('#browser path[fill="#2266aa"]');
    const plot = document.querySelector('#browser rect[fill="transparent"][pointer-events="none"]').getBoundingClientRect();
    const filled = (base, score) => {
      const point = new DOMPoint(section.left + 100 + (base - 190), plot.top + (10 - score) * 8);
      return path.isPointInFill(point.matrixTransform(path.getScreenCTM().inverse()));
    };
    return [filled(410.5, 6), filled(410.5, 8), filled(520.5, -7), filled(520.5, -9), filled(280.5, 1)];
  })()`);
  assert.deepEqual(
    samples,
    [true, false, true, false, false],
    "BigWig must draw the +7 and -8 fixture blocks at their genomic positions, with the gap empty",
  );
}
