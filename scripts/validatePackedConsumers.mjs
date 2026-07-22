import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = mkdtempSync(path.join(tmpdir(), "genomebrowser-packed-consumer-"));
const packsDirectory = path.join(temporaryRoot, "packs");
const consumerDirectory = path.join(temporaryRoot, "consumer");

mkdirSync(packsDirectory);
mkdirSync(consumerDirectory);

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
}

function pack(packageName, tarballName) {
  run("pnpm", ["--filter", packageName, "pack", "--pack-destination", packsDirectory]);
  const tarballPath = path.join(packsDirectory, tarballName);
  assert.equal(statSync(tarballPath).isFile(), true, `missing packed tarball ${tarballName}`);
  return tarballPath;
}

function inspectTarball(tarballPath, expected) {
  const paths = run("tar", ["-tzf", tarballPath], { capture: true }).trim().split("\n");
  const pathSet = new Set(paths);

  for (const requiredPath of expected.requiredPaths) {
    assert(pathSet.has(requiredPath), `${path.basename(tarballPath)} is missing ${requiredPath}`);
  }
  for (const requiredPattern of expected.requiredPatterns) {
    assert(
      paths.some((entry) => requiredPattern.test(entry)),
      `${path.basename(tarballPath)} has no path matching ${requiredPattern}`,
    );
  }

  const forbidden = paths.filter(
    (entry) =>
      /^package\/(?:src|test|tests|__tests__)(?:\/|$)/i.test(entry) ||
      /\/(__tests__|test|tests)\//i.test(entry) ||
      /(^|\/)(\.env(?:\..*)?|[^/]*(?:secret|credential)[^/]*)$/i.test(entry) ||
      (/\.(?:ts|tsx)$/i.test(entry) && !/\.d\.ts$/i.test(entry)),
  );
  assert.deepEqual(forbidden, [], `forbidden packed paths: ${forbidden.join(", ")}`);

  const textPaths = paths.filter((entry) =>
    /\.(?:css|html|js|json|map|md|mjs|ts|txt)$/i.test(entry),
  );
  const secretPatterns = [
    /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bnpm_[A-Za-z0-9]{20,}\b/,
    /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'](?!YOUR_|your-|<|process\.env|import\.meta\.env|\$\{)[^"'\r\n]{8,}["']/i,
  ];
  const contentFindings = [];
  let sourceMapCount = 0;

  for (const entry of textPaths) {
    const content = run("tar", ["-xOzf", tarballPath, entry], { capture: true });
    if (entry.endsWith(".map")) {
      sourceMapCount += 1;
      const sourceMap = JSON.parse(content);
      const populatedSources = sourceMap.sourcesContent?.filter(
        (sourceContent) => typeof sourceContent === "string" && sourceContent.length > 0,
      );
      assert.equal(
        populatedSources?.length ?? 0,
        0,
        `${entry} embeds ${populatedSources?.length ?? 0} original sources`,
      );
    }
    if (secretPatterns.some((pattern) => pattern.test(content))) {
      contentFindings.push(entry);
    }
  }
  assert.deepEqual(
    contentFindings,
    [],
    `high-confidence credential material found in: ${contentFindings.join(", ")}`,
  );
  assert(sourceMapCount > 0, `${path.basename(tarballPath)} contains no source maps to inspect`);

  const manifest = JSON.parse(
    run("tar", ["-xOzf", tarballPath, "package/package.json"], { capture: true }),
  );
  assert.equal(manifest.name, expected.name);
  assert.equal(manifest.version, "2.0.0-alpha.0");
  assert.equal(manifest.publishConfig?.access, "public");
  assert.equal(manifest.publishConfig?.tag, "alpha");
  if (expected.runtimeDependency) {
    assert.equal(manifest.dependencies?.["@weng-lab/genomebrowser"], "^2.0.0-alpha.0");
  }

  console.log(
    `Inspected ${path.basename(tarballPath)}: ${manifest.name}@${manifest.version}, ${paths.length} paths, ${sourceMapCount} source maps without embedded sources, no forbidden paths or high-confidence credential material`,
  );
}

try {
  const coreTarball = pack("@weng-lab/genomebrowser", "weng-lab-genomebrowser-2.0.0-alpha.0.tgz");
  const uiTarball = pack(
    "@weng-lab/genomebrowser-ui",
    "weng-lab-genomebrowser-ui-2.0.0-alpha.0.tgz",
  );

  inspectTarball(coreTarball, {
    name: "@weng-lab/genomebrowser",
    requiredPaths: [
      "package/package.json",
      "package/LICENSE",
      "package/dist/genomebrowser.es.js",
      "package/dist/genomebrowser.es.js.map",
      "package/dist/src/lib.d.ts",
      "package/docs/README.md",
    ],
    requiredPatterns: [/^package\/dist\/.+\.d\.ts$/],
  });
  inspectTarball(uiTarball, {
    name: "@weng-lab/genomebrowser-ui",
    runtimeDependency: true,
    requiredPaths: [
      "package/package.json",
      "package/LICENSE",
      "package/dist/genomebrowser-ui.es.js",
      "package/dist/genomebrowser-ui.es.js.map",
      "package/dist/src/lib.d.ts",
      "package/dist/src/cli.d.ts",
      "package/dist/cli.js",
      "package/dist/trackselect.js",
      "package/docs/README.md",
      "package/schemas/trackSelectCatalog.schema.json",
    ],
    requiredPatterns: [/^package\/dist\/.+\.d\.ts$/],
  });

  writeFileSync(
    path.join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "packed-consumer-smoke-test", private: true, type: "module" }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(consumerDirectory, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  );
  mkdirSync(path.join(consumerDirectory, "src"));
  writeFileSync(
    path.join(consumerDirectory, "src/main.tsx"),
    `import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({ region: "chr1:1-1000", trackWidth: 800 });
const useTrackStore = createTrackStore({ modules: [] });

function App() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Tracks</button><GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} /><TrackSelect open={open} onClose={() => setOpen(false)} trackCatalogs={[]} useTrackStore={useTrackStore} /></>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
`,
  );
  writeFileSync(
    path.join(consumerDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          useDefineForClassFields: true,
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: false,
          moduleResolution: "Bundler",
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: "force",
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );

  run(
    "npm",
    [
      "install",
      "--save-exact",
      coreTarball,
      uiTarball,
      "react@^19.2.0",
      "react-dom@^19.2.0",
      "@types/react@^19.2.0",
      "@types/react-dom@^19.2.0",
      "@emotion/react@^11.0.0",
      "@emotion/styled@^11.0.0",
      "@mui/icons-material@^7.0.0",
      "@mui/material@^7.0.0",
      "@mui/x-data-grid-premium@^8.0.0",
      "@mui/x-license@^8.0.0",
      "@mui/x-tree-view@^8.0.0",
      "typescript@^5.9.0",
      "vite@^8.0.0",
    ],
    { cwd: consumerDirectory },
  );

  const lockfile = JSON.parse(
    readFileSync(path.join(consumerDirectory, "package-lock.json"), "utf8"),
  );
  for (const [packageName, tarballPath] of [
    ["@weng-lab/genomebrowser", coreTarball],
    ["@weng-lab/genomebrowser-ui", uiTarball],
  ]) {
    const installedPath = realpathSync(path.join(consumerDirectory, "node_modules", packageName));
    assert(installedPath.startsWith(`${consumerDirectory}${path.sep}`));
    assert(!installedPath.startsWith(`${root}${path.sep}`));
    const lockEntry = lockfile.packages[`node_modules/${packageName}`];
    assert.equal(lockEntry.version, "2.0.0-alpha.0");
    assert.equal(lockEntry.resolved, `file:${path.relative(consumerDirectory, tarballPath)}`);
    console.log(
      `${packageName}@${lockEntry.version} installed from ${lockEntry.resolved} at ${installedPath}`,
    );
  }
  assert.equal(
    lockfile.packages["node_modules/@weng-lab/genomebrowser-ui"].dependencies[
      "@weng-lab/genomebrowser"
    ],
    "^2.0.0-alpha.0",
  );
  console.log("Consumer is outside the workspace and has no Vite aliases");

  run("npx", ["tsc", "--noEmit"], { cwd: consumerDirectory });
  console.log("TypeScript resolved both public roots through emitted declarations");
  run("npx", ["vite", "build"], { cwd: consumerDirectory });
  console.log("Production browser build imported and used both packed public roots");

  run(
    "node",
    [
      "--input-type=module",
      "--eval",
      'import { defineTrackSelectConfig } from "@weng-lab/genomebrowser-ui/cli"; if (defineTrackSelectConfig({ modules: [] }).modules.length !== 0) process.exit(1);',
    ],
    { cwd: consumerDirectory },
  );
  console.log("@weng-lab/genomebrowser-ui/cli imported successfully");
  run(path.join(consumerDirectory, "node_modules/.bin/trackselect"), ["--help"], {
    cwd: consumerDirectory,
  });
  assert(
    statSync(
      path.join(consumerDirectory, "node_modules/@weng-lab/genomebrowser-ui/dist/trackselect.js"),
    ).mode & 0o111,
  );
  console.log("Installed trackselect executable is executable and --help succeeded");
  console.log("Packed consumer validation passed");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
  console.log(`Cleaned ${temporaryRoot}`);
}
