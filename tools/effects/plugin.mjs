import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const reviewed = JSON.parse(readFileSync(new URL("./classifications.json", import.meta.url)));
export default {
  meta: { name: "effects-spike" },
  rules: {
    "external-only": {
      meta: { type: "problem", schema: [], messages: { forbidden: "{{reason}}" } },
      create(context) {
        const names = new Set();
        const namespaces = new Set();
        let ordinal = 0;
        return {
          ImportDeclaration(node) {
            if (node.source.value !== "react") return;
            for (const specifier of node.specifiers) {
              if (specifier.type !== "ImportSpecifier") namespaces.add(specifier.local.name);
              else if (["useEffect", "useLayoutEffect"].includes(specifier.imported.name))
                names.add(specifier.local.name);
            }
          },
          CallExpression(node) {
            const callee = node.callee;
            if (
              !(callee.type === "Identifier" && names.has(callee.name)) &&
              !(
                callee.type === "MemberExpression" &&
                !callee.computed &&
                namespaces.has(callee.object.name) &&
                ["useEffect", "useLayoutEffect"].includes(callee.property.name)
              )
            )
              return;
            const file = relative(root, context.filename).split("\\").join("/");
            const entry = reviewed[`${file}#${++ordinal}`];
            const fingerprint = createHash("sha256")
              .update(context.sourceCode.getText(node))
              .digest("hex");
            if (entry?.fingerprint === fingerprint && entry.category === "external sync") return;
            const reason =
              entry?.fingerprint === fingerprint
                ? `${entry.category}: ${entry.replacement}`
                : "Unreviewed effect. Compute derived values during render; reset by identity/key; put interactions in handlers; use a query/route owner for fetching. If this owns DOM, refs, observers, subscriptions or timers, review and fingerprint it in tools/effects/classifications.json.";
            context.report({ node, messageId: "forbidden", data: { reason } });
          },
        };
      },
    },
  },
};
