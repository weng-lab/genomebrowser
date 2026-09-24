import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// Enforces the dependency rules in docs/architecture.md.

const root = fileURLToPath(new URL("..", import.meta.url));

/** Features each feature may import. `app` may import any feature. */
const allowedFeatureImports: Record<string, readonly string[]> = {
  assemblies: [],
  "session-snapshot": ["assemblies"],
  auth: [],
  sessions: ["session-snapshot", "assemblies", "auth"],
  "custom-tracks": ["session-snapshot", "assemblies", "auth"],
  browser: ["sessions", "custom-tracks", "session-snapshot", "assemblies"],
  site: ["sessions", "auth"],
};
const areasWithoutFeatures = new Set(["components", "lib"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function localImports(file: string) {
  const source = readFileSync(join(root, file), "utf8");
  return [...source.matchAll(/(?:from|import)\s+"([^"]+)"/g)]
    .map(([, specifier]) => specifier)
    .flatMap((specifier) => {
      if (specifier.startsWith("@/")) return [specifier.slice(2)];
      if (specifier.startsWith(".")) return [normalize(join(dirname(file), specifier))];
      return [];
    });
}

/** `features/<name>/...` paths, split into the feature and its path within the feature. */
function featurePath(path: string) {
  const [area, feature, ...rest] = path.split("/");
  return area === "features" ? { feature, inner: rest } : null;
}

const files = ["app", "components", "db", "features", "lib"].flatMap(sourceFiles);
const violations = files.flatMap((file) => {
  const from = featurePath(file);
  const area = file.split("/")[0];
  return localImports(file).flatMap((target) => {
    const to = featurePath(target);
    if (!to || to.feature === from?.feature) return [];
    const importer = from ? `features/${from.feature}` : area;
    if (to.inner.length > 1) {
      return [`${file} imports ${target}: only a feature's top-level files are public`];
    }
    if (areasWithoutFeatures.has(area))
      return [`${file} imports ${target}: ${area} imports no features`];
    if (area === "db" && to.feature !== "session-snapshot") {
      return [`${file} imports ${target}: db imports only session-snapshot types`];
    }
    if (from && !allowedFeatureImports[from.feature]?.includes(to.feature)) {
      return [`${file} imports ${target}: ${importer} may not import features/${to.feature}`];
    }
    return [];
  });
});

it("finds application source files to check", () => {
  expect(files.length).toBeGreaterThan(20);
  expect(Object.keys(allowedFeatureImports).sort()).toEqual(
    readdirSync(join(root, "features")).sort(),
  );
});

it("keeps feature dependencies one-way and internals private", () => {
  expect(violations.map((violation) => relative(".", violation))).toEqual([]);
});
