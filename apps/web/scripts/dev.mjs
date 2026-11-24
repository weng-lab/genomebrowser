// Local development: the Eve agent and Next.js, as `withEve` runs them, except
// that the agent starts with `--resume`. Each saved session keeps one agent
// conversation, and Eve's local runtime otherwise leaves conversations from an
// earlier `eve dev` dormant, so every restart would break them. On Vercel
// conversations survive deployments, so this keeps local behavior the same.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

async function freePort() {
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  await new Promise((resolve) => {
    server.close(resolve);
  });
  return address.port;
}

const port = Number(process.env.GB_EVE_DEV_PORT) || (await freePort());
const agent = `http://127.0.0.1:${port}`;
const children = [];

function run(args, env = {}) {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  children.push(child);
  // When either stops, stop the other, so the pair never outlives one half.
  child.on("exit", (code) => {
    for (const other of children) if (other !== child && other.exitCode === null) other.kill();
    process.exitCode = code ?? 1;
  });
  return child;
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const child of children) if (child.exitCode === null) child.kill(signal);
  });

run([
  "node_modules/eve/bin/eve.js",
  "dev",
  "--no-ui",
  "--resume",
  "--host",
  "127.0.0.1",
  "--port",
  String(port),
]);

// Next.js proxies `/eve/v1/*` to the agent once it answers.
for (let attempt = 0; ; attempt++) {
  try {
    if ((await fetch(`${agent}/eve/v1/health`)).ok) break;
  } catch {
    // Not listening yet.
  }
  if (attempt > 360) throw new Error(`The Eve agent did not start at ${agent}`);
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
}

run(
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", ...process.argv.slice(2)],
  {
    EVE_BASE_URL: agent,
  },
);
