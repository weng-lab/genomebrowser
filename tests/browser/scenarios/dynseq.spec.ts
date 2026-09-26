import { test, expect } from "./test";

test("dynseq switches between signal and sequence across zoom, resize, and display settings", async ({
  page,
}) => {
  // Preserve the existing dynseq browser coverage while sharing the standard runner.
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  const glyphSelector = '#dynseq g[transform*="scale("] > path';
  const glyphs = page.locator(glyphSelector);
  const click = (name: string) => page.getByRole("button", { name, exact: true }).click();
  const letters = async (present: boolean) => {
    if (present) await expect(glyphs.first()).toBeVisible();
    else await expect(glyphs).toHaveCount(0);
    await expect(page.locator('#dynseq [role="progressbar"]')).toHaveCount(0);
  };
  const sameSignal = async () => {
    await letters(false);
    // Scientific SVG parity, independent of generated IDs, from the original suite.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const plot = (id: string) =>
            document.querySelector(id + ' rect[fill="transparent"][pointer-events="none"]')
              ?.parentElement;
          const a = plot("#dynseq"),
            b = plot("#bigwig");
          return !!a && !!b && a.innerHTML === b.innerHTML;
        }),
      )
      .toBe(true);
  };

  await page.goto("/dynseq.html");
  await sameSignal();
  expect(requests.filter((url) => url.endsWith(".2bit"))).toEqual([]);
  await test.step("Zoom to sequence and verify sparse glyph dimensions", async () => {
    await click("Sequence");
    await letters(true);
    expect(requests).toContain("/reference.2bit");
    const geometry = await glyphs.first().evaluate((path) => {
      const glyph = path.parentElement as unknown as SVGGElement;
      const cell = glyph.parentElement!.querySelector("rect")!;
      return {
        height: glyph.transform.baseVal.consolidate()!.matrix.d * 100,
        width: Number(cell.getAttribute("width")),
        viewport: document.querySelector("#dynseq")!.getBoundingClientRect().width,
      };
    });
    expect(geometry.width).toBeCloseTo((geometry.viewport - 100) / 100, 1);
    expect(geometry.height).toBeCloseTo(80, 3);
  });
  await test.step("Change thresholds and resize while retaining signal parity", async () => {
    await click("Clamp");
    await click("Hide letters");
    await sameSignal();
    await click("Show letters");
    await letters(true);
    await click("Require wider letters");
    await sameSignal();
    await click("Default letters");
    await letters(true);
    await click("Narrow");
    await sameSignal();
    await click("Expand");
    await letters(true);
  });
  await test.step("Hover negative sequence scores", async () => {
    await click("Negative");
    await letters(true);
    const hover = await glyphs.evaluateAll((paths) => {
      const section = document.querySelector("#dynseq")!.getBoundingClientRect();
      const cells = paths.map((path) => path.parentElement!.parentElement!.querySelector("rect")!);
      const cell = cells.find((cell) => {
        const r = cell.getBoundingClientRect();
        return r.left > section.left + 100 && r.right < section.right;
      })!;
      const rect = cell.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.move(hover.x, hover.y);
    await expect(page.getByText("-8.0000", { exact: true })).toBeVisible();
  });
  await test.step("Signal-only views do not fetch sequence; shared settings remain available", async () => {
    await click("Dense");
    await sameSignal();
    await click("Break reference");
    await sameSignal();
    expect(requests).not.toContain("/broken.2bit");
    await click("Wide");
    await click("Full");
    await sameSignal();
    expect(requests).not.toContain("/broken.2bit");
    await page.locator("#dynseq").getByRole("button", { name: "Settings for Signal" }).click();
    const settings = page.getByRole("dialog", { name: "Configure Signal" });
    await expect(settings.getByRole("group", { name: "Y-axis range" })).toBeVisible();
    for (const label of ["Minimum pixels per base", "Scores BigWig URL"]) {
      await expect(settings.getByRole("textbox", { name: label, exact: true })).toBeVisible();
    }
    for (const label of ["Fill missing values with zero", "Show clamp indicators"]) {
      await expect(settings.getByRole("switch", { name: label, exact: true })).toBeVisible();
    }
  });
});
