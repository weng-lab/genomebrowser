import { DefaultSandbox, defineSandbox } from "eve/sandbox";

// The agent has no sandbox tools; this is Eve's default sandbox, except that a
// local dev or eval server never installs just-bash into the app on its own.
export const environment = DefaultSandbox.environment({ justBash: { autoInstall: false } });

export default defineSandbox(() => environment.open());
