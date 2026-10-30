import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { root } from "./audit.mjs";
const ts = createRequire(new URL("../../packages/core/package.json", import.meta.url))(
  "typescript",
);
const baseline = "581f353f2086cd9ad3f0e1e6694ce79202acb1dc";
const prefix = "apps/web/features/sessions/";
function measure(source) {
  const tree = ts.createSourceFile("flow.ts", source, ts.ScriptTarget.Latest, true);
  let decisions = 0;
  let functions = 0;
  const kinds = new Set([
    ts.SyntaxKind.IfStatement,
    ts.SyntaxKind.ConditionalExpression,
    ts.SyntaxKind.CaseClause,
    ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.CatchClause,
  ]);
  function visit(node) {
    if (kinds.has(node.kind)) decisions++;
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(node.operatorToken.kind)
    )
      decisions++;
    if (ts.isFunctionLike(node) && node.body) functions++;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    source,
  );
  const lines = new Set();
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    const start = tree.getLineAndCharacterOfPosition(scanner.getTokenPos()).line;
    const end = tree.getLineAndCharacterOfPosition(scanner.getTextPos() - 1).line;
    for (let line = start; line <= end; line++) lines.add(line);
  }
  return {
    physicalLines: source.trimEnd().split("\n").length,
    sourceLines: lines.size,
    decisions,
    functions,
    summedComplexity: decisions + functions,
  };
}
const files = Object.fromEntries(
  ["autosave.ts", "saveLifecycle.ts", "saveReducer.ts", "saveXState.ts"].map((file) => [
    file,
    measure(readFileSync(root + prefix + file, "utf8")),
  ]),
);
const before = measure(
  execFileSync("git", ["show", `${baseline}:${prefix}autosave.ts`], {
    cwd: root,
    encoding: "utf8",
  }),
);
const sum = (names) =>
  Object.fromEntries(
    Object.keys(before).map((key) => [
      key,
      names.reduce((total, name) => total + files[name][key], 0),
    ]),
  );
const report = {
  baseline,
  definition:
    "Physical lines include comments/blanks. Source lines contain a non-trivia TypeScript token. Decisions count if, ternary, case, loops, catch, &&, ||, ??. Summed complexity = decisions + functions with bodies; it is a reproducible syntactic proxy, not runtime or cognitive complexity. Declarative XState transition edges are not counted by this proxy.",
  before,
  files,
  reducerTotal: sum(["autosave.ts", "saveLifecycle.ts", "saveReducer.ts"]),
  xstateTotal: sum(["autosave.ts", "saveLifecycle.ts", "saveXState.ts"]),
};
const output = JSON.stringify(report, null, 2) + "\n";
if (process.argv.includes("--write"))
  writeFileSync(new URL("./metrics.json", import.meta.url), output);
else if (readFileSync(new URL("./metrics.json", import.meta.url), "utf8") !== output)
  throw new Error("Metrics drift: rerun with --write and review.");
console.log(output);
