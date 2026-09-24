// Importing bippy installs the React DevTools hook, which must exist before react-dom
// is evaluated. That is why consumers load this module through vitest `setupFiles`.
import { instrument } from "bippy";
import { createRegistry, getRegistry } from "./internal/registry";

if (!getRegistry()) {
  const registry = createRegistry();
  instrument({
    onCommitFiberRoot: (_rendererId, root) => registry.onCommit?.(root),
  });
}
