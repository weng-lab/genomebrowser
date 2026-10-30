import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../packages/core/package.json", import.meta.url));
const ts = require("typescript");
export const root = fileURLToPath(new URL("../../", import.meta.url));
export function scan() {
  function walk(dir) {
    return readdirSync(root + dir, { withFileTypes: true }).flatMap((entry) => {
      if (["node_modules", ".next", "dist", "coverage", ".turbo", ".git"].includes(entry.name))
        return [];
      const path = dir + "/" + entry.name;
      return entry.isDirectory() ? walk(path) : /\.[cm]?[jt]sx?$/.test(path) ? [path] : [];
    });
  }
  const files = [...walk("apps/web"), ...walk("packages/core")].sort();
  const sites = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(root + file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const names = new Map();
    const namespaces = new Set();
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== "react") continue;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
      if (node.importClause?.name) namespaces.add(node.importClause.name.text);
      if (bindings && ts.isNamedImports(bindings))
        for (const item of bindings.elements) {
          const name = (item.propertyName ?? item.name).text;
          if (["useEffect", "useLayoutEffect"].includes(name)) names.set(item.name.text, name);
        }
    }
    let ordinal = 0;
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const hook = ts.isIdentifier(callee)
          ? names.get(callee.text)
          : ts.isPropertyAccessExpression(callee) &&
              namespaces.has(callee.expression.getText(source)) &&
              ["useEffect", "useLayoutEffect"].includes(callee.name.text)
            ? callee.name.text
            : undefined;
        if (hook)
          sites.push({
            id: `${file}#${++ordinal}`,
            file,
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            hook,
            body: node.getText(source),
          });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return sites;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sites = scan();
  if (process.argv.includes("--inventory")) {
    console.log(JSON.stringify(sites, null, 2));
    process.exit(0);
  }
  const classifications = JSON.parse(
    readFileSync(new URL("./classifications.json", import.meta.url)),
  );
  const categories = [
    "derived state",
    "syncing state",
    "event logic",
    "external sync",
    "data fetching",
  ];
  const counts = Object.fromEntries(categories.map((c) => [c, 0]));
  for (const site of sites) {
    const entry = classifications[site.id];
    if (!entry || !categories.includes(entry.category) || !entry.replacement)
      throw new Error(`Missing classification: ${site.id}`);
    if (createHash("sha256").update(site.body).digest("hex") !== entry.fingerprint)
      throw new Error(`Effect changed; review classification: ${site.id}`);
    Object.assign(site, entry);
    counts[site.category]++;
  }
  for (const id of Object.keys(classifications))
    if (!sites.some((s) => s.id === id)) throw new Error(`Stale classification: ${id}`);
  const report = {
    total: sites.length,
    counts,
    scopes: Object.fromEntries(
      ["apps/web", "packages/core"].map((scope) => [
        scope,
        sites.filter((s) => s.file.startsWith(scope)).length,
      ]),
    ),
    sites: sites.map(({ body, ...site }) => site),
  };
  const output = JSON.stringify(report, null, 2) + "\n";
  if (process.argv.includes("--write"))
    writeFileSync(new URL("./audit.json", import.meta.url), output);
  else if (readFileSync(new URL("./audit.json", import.meta.url), "utf8") !== output)
    throw new Error("Audit drift: run node tools/effects/audit.mjs --write and review.");
  console.log(JSON.stringify({ total: report.total, counts, scopes: report.scopes }, null, 2));
}
