/**
 * Repository rules that Oxlint's built-in rules cannot express. Each message states the fix.
 */

const isFunction = (node) =>
  node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const noOwnSourceMock = {
  meta: {
    type: "problem",
    docs: { description: "Keep a test's own package code real instead of mocking it." },
    messages: {
      ownSource:
        "Do not mock this package's own module {{path}}. Drive the behavior through the interface consumers use, and mock only at a boundary outside the behavior under test, such as another package or a remote service.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type !== "MemberExpression" ||
          callee.object.type !== "Identifier" ||
          callee.object.name !== "vi" ||
          callee.property.type !== "Identifier" ||
          !["mock", "doMock"].includes(callee.property.name)
        ) {
          return;
        }
        const [path] = node.arguments;
        if (
          path?.type === "Literal" &&
          typeof path.value === "string" &&
          /^[./]/.test(path.value)
        ) {
          context.report({ node: path, messageId: "ownSource", data: { path: path.value } });
        }
      },
    };
  },
};

const storeHookName = {
  meta: {
    type: "problem",
    docs: { description: "Name Zustand stores that are called as hooks use*." },
    messages: {
      name: "{{name}} is called as a hook. Name the store use{{suggested}} so React tooling and the compiler treat it as one.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === "Identifier" &&
          /Store$/.test(callee.name) &&
          !/^(?:use|create)[A-Z]/.test(callee.name) &&
          isFunction(node.arguments[0])
        ) {
          const suggested = callee.name[0].toUpperCase() + callee.name.slice(1);
          context.report({
            node: callee,
            messageId: "name",
            data: { name: callee.name, suggested },
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "genomebrowser" },
  rules: { "no-own-source-mock": noOwnSourceMock, "store-hook-name": storeHookName },
};
