import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const oxlint = join(root, "node_modules/.bin/oxlint");
const config = readFileSync(join(root, ".oxlintrc.json"), "utf8");

// Exercise the actual CLI/config seam, including package-local config discovery.
// Generated fixtures stay outside the workspace so forbidden examples cannot leak into lint/build.
test("lint policy rejects forbidden imports and accepts supported dependencies", () => {
  const fixture = mkdtempSync(join(tmpdir(), "genomebrowser-lint-"));
  const write = (path, source) => {
    mkdirSync(dirname(join(fixture, path)), { recursive: true });
    writeFileSync(join(fixture, path), source);
  };
  try {
    write(".oxlintrc.json", config);
    mkdirSync(join(fixture, "node_modules"));
    symlinkSync(
      join(root, "node_modules/oxlint-tsgolint"),
      join(fixture, "node_modules/oxlint-tsgolint"),
      "dir",
    );
    write(
      "tsconfig.json",
      JSON.stringify({ compilerOptions: { noEmit: true, lib: ["esnext"] }, include: ["**/*.ts"] }),
    );
    const cases = [
      ["apps/web/shared/probe.ts", "../features/browser/view", false],
      ["apps/web/shared/probe.ts", "../composition/providers", false],
      ["apps/web/shared/probe.ts", "../app/page", false],
      ["apps/web/shared/probe.ts", "./workspace/types", true],
      ["apps/web/shared/workspace/probe.ts", "@weng-lab/genomebrowser", false],
      ["apps/web/features/browser/probe.ts", "../../composition/providers", false],
      ["apps/web/features/browser/probe.ts", "../../app/page", false],
      ["apps/web/features/account/components/probe.ts", "../server/identity", true],
      ["apps/web/features/browser/probe.ts", "../../shared/workspace/types", true],
      ["apps/web/composition/probe.ts", "../features/browser/view", true],
      ["apps/web/composition/probe.ts", "../../server/src/tabs", false],
      ["apps/server/src/probe.ts", "../../web/features/browser/view", false],
      ["apps/server/src/probe.ts", "@weng-lab/contracts", true],
      ["apps/server/src/probe.ts", "pg", false],
      ["apps/server/src/probe.ts", "drizzle-orm", false],
      ["apps/contracts/src/probe.ts", "react", false],
      ["apps/contracts/src/probe.ts", "../../web/features/browser/view", false],
      ["apps/contracts/src/probe.ts", "@weng-lab/genomebrowser", false],
      ["apps/contracts/src/probe.ts", "zod", true],
      ["apps/contracts/src/probe.ts", "../../../scripts/operation", false],
      ["apps/web/features/browser/probe.ts", "drizzle-orm", false],
      ["apps/web/app/api/probe.ts", "pg", false],
      ["apps/web/shared/probe.ts", "pg", false],
      ["apps/web/features/sessions/server/probe.ts", "drizzle-orm", true],
      ["apps/web/composition/server.ts", "pg", true],
      ["apps/contracts/src/probe.ts", "./region", true],
      ["packages/core/src/probe.ts", "@weng-lab/genomebrowser-tracks", false],
      ["packages/reader/src/probe.ts", "react", false],
      ["packages/tracks/src/probe.ts", "../../ui/src/index", false],
      ["packages/tracks/src/probe.ts", "@weng-lab/genomebrowser", true],
      ["packages/ui/src/probe.ts", "@weng-lab/genomebrowser-tracks", true],
    ];
    for (const [path, imported, allowed] of cases) {
      write(path, `export { value } from ${JSON.stringify(imported)};\n`);
      const packageDir = path.split("/").slice(0, 2).join("/");
      for (const cwd of [fixture, join(fixture, packageDir)]) {
        const result = spawnSync(oxlint, [".", "--format", "json"], { cwd, encoding: "utf8" });
        assert.ok(result.stdout.startsWith("{"), result.stdout + result.stderr);
        const report = JSON.parse(result.stdout);
        const restricted = report.diagnostics.filter(
          (diagnostic) => diagnostic.code === "eslint(no-restricted-imports)",
        );
        assert.equal(
          restricted.length > 0,
          !allowed,
          `${path} -> ${imported} (cwd ${cwd}): ${result.stdout}`,
        );
      }
      rmSync(join(fixture, path));
    }
    write(
      "apps/web/features/probe.ts",
      "export const value = 1; // oxlint-disable-line no-debugger\n",
    );
    let result = spawnSync(oxlint, [".", "--format", "json"], {
      cwd: join(fixture, "apps/web"),
      encoding: "utf8",
    });
    assert.match(result.stdout, /Unused oxlint-disable directive/);
    rmSync(join(fixture, "apps/web/features/probe.ts"));
    write(
      "apps/web/features/probe.ts",
      "export const value = 1; // eslint-disable-line no-debugger\n",
    );
    result = spawnSync(oxlint, [".", "--format", "json"], {
      cwd: join(fixture, "apps/web"),
      encoding: "utf8",
    });
    assert.match(result.stdout, /Unused eslint-disable directive/);
    rmSync(join(fixture, "apps/web/features/probe.ts"));

    write(
      "apps/web/features/violations.ts",
      `
import { useEffect } from "react";
const unused = 1;
export function useProbe(value: number) { useEffect(() => { console.log(value); }, []); }
Promise.reject(new Error("bare"));
void Promise.reject(new Error("void"));
declare function listen(callback: () => void): void;
listen(async () => {});
`,
    );
    result = spawnSync(oxlint, [".", "--format", "json"], {
      cwd: join(fixture, "apps/web"),
      encoding: "utf8",
    });
    const diagnostics = JSON.parse(result.stdout).diagnostics;
    for (const code of [
      "eslint(no-unused-vars)",
      "react-hooks(exhaustive-deps)",
      "typescript(no-floating-promises)",
      "typescript(no-misused-promises)",
    ]) {
      assert.ok(
        diagnostics.some(
          (diagnostic) => diagnostic.code === code && diagnostic.severity === "error",
        ),
        `${code}: ${result.stdout}`,
      );
    }
    assert.equal(
      diagnostics.filter((diagnostic) => diagnostic.code === "typescript(no-floating-promises)")
        .length,
      2,
    );
    rmSync(join(fixture, "apps/web/features/violations.ts"));
    write(
      "apps/web/features/handled.ts",
      'Promise.reject(new Error("handled")).catch(() => {});\n',
    );
    result = spawnSync(oxlint, [".", "--format", "json"], {
      cwd: join(fixture, "apps/web"),
      encoding: "utf8",
    });
    assert.equal(
      JSON.parse(result.stdout).diagnostics.filter((diagnostic) => diagnostic.severity === "error")
        .length,
      0,
      result.stdout,
    );
    rmSync(join(fixture, "apps/web/features/handled.ts"));
    write("apps/server/src/a.ts", 'import { b } from "./b"; export const a = () => b;\n');
    write("apps/server/src/b.ts", 'import { a } from "./a"; export const b = () => a;\n');
    result = spawnSync(oxlint, [".", "--format", "json"], {
      cwd: join(fixture, "apps/server"),
      encoding: "utf8",
    });
    assert.match(result.stdout, /import\(no-cycle\)/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
