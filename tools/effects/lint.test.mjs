import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { root } from "./audit.mjs";
const lint = (paths) => {
  const result = spawnSync(
    join(root, "node_modules/.bin/oxlint"),
    ["-c", join(root, "tools/effects/oxlint.json"), "--format", "json", ...paths],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  return JSON.parse(result.stdout).diagnostics;
};
test("actual oxlint rule flags all seven reviewed non-external sites and allows 28 external sites", () => {
  const diagnostics = lint(["apps/web", "packages/core"]);
  assert.equal(diagnostics.length, 7, JSON.stringify(diagnostics));
  assert.ok(diagnostics.every((d) => d.severity === "warning"));
  assert.ok(diagnostics.some((d) => d.message.includes("row-derived height")));
});
test("new aliased and namespace effects require review; ordinary calls and effect events do not", () => {
  const dir = mkdtempSync(join(tmpdir(), "effects-lint-"));
  try {
    const path = join(dir, "fixture.tsx");
    writeFileSync(
      path,
      `import React, {useEffect as effect, useEffectEvent} from 'react';
      effect(() => setName(first + last), [first, last]);
      React.useLayoutEffect(() => setDraft(value), [value]);
      React.useEffect(() => fetch('/api/sessions'), []);
      effect(() => submitted && send(), [submitted]);
      useEffectEvent(() => {}); ordinaryCall();`,
    );
    const diagnostics = lint([path]);
    assert.equal(diagnostics.length, 4);
    assert.ok(diagnostics.every((d) => d.message.includes("Compute derived values")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
