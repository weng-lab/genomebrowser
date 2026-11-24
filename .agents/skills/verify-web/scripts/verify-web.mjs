#!/usr/bin/env node
/**
 * Harness for driving and verifying @weng-lab/web (and its Vite design gallery)
 * with isolated agent-browser sessions, Clerk dev sign-in tokens, health checks,
 * evidence capture, and safe teardown.
 */
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../../..");
const WEB_DIR = join(REPO_ROOT, "apps/web");
const ENV_LOCAL_PATH = join(WEB_DIR, ".env.local");
const NEXT_DEV_LOCK = join(WEB_DIR, ".next/dev/lock");
const LATEST_POINTER = "/tmp/gb-verify-latest.txt";
const EVIDENCE_ROOT = "/tmp/gb-verify-evidence";
const DEFAULT_VERIFY_EMAIL = "verify-web+clerk_test@example.com";
const DEFAULT_PORT = 3099;
const DEFAULT_DESIGN_PORT = 3109;
const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

function usage() {
  console.log(`Usage: verify-web.mjs <command> [options]

Commands:
  launch [--port <n>] [--run-id <id>] [--signed-out] [--design] [--skip-migrate] [--viewport <WxH>]
      Start an isolated @weng-lab/web (or design gallery) instance and open a matching agent-browser session.
  doctor [--run-id <id>]
      Read-only health check: server process, HTTP readiness, Postgres/Redis, browser session, auth, and git HEAD.
  browser [--run-id <id>] [--] <agent-browser args...>
      Run an agent-browser command against this run's isolated session.
  screenshot [--run-id <id>] <name> [--full] [--annotate]
      Save a PNG screenshot under the run's evidence directory and print its path.
  snapshot [--run-id <id>] <name> [--full]
      Save an ARIA snapshot (.aria.txt) under the run's evidence directory and print its path.
  record [--run-id <id>] start <name> | stop
      Record a .webm video under the run's evidence directory.
  mcp-token [--run-id <id>]
      Print a short-lived Clerk Bearer token for calling /api/mcp as the signed-in verification user.
  cleanup [--run-id <id>] [--all-verify-sessions]
      Delete sessions created during this run, close the browser session, stop the server, and keep evidence intact.
  evidence [--run-id <id>]
      Print the evidence directory and list captured artifacts.
`);
}

function fail(message) {
  console.error(`verify-web: ${message}`);
  process.exit(1);
}

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const result = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

function loadWebEnv() {
  const fileEnv = parseDotEnv(ENV_LOCAL_PATH);
  return { ...fileEnv, ...process.env };
}

function stateDirFor(runId) {
  return `/tmp/gb-verify-${runId}`;
}

function statePathFor(runId) {
  return join(stateDirFor(runId), "state.json");
}

function resolveRunId(explicitRunId) {
  if (explicitRunId) return explicitRunId;
  if (process.env.GB_VERIFY_RUN_ID) return process.env.GB_VERIFY_RUN_ID;
  if (existsSync(LATEST_POINTER)) {
    const id = readFileSync(LATEST_POINTER, "utf8").trim();
    if (id) return id;
  }
  fail("No active verification run found. Run `launch` first or pass `--run-id <id>`.");
}

function loadState(explicitRunId) {
  const runId = resolveRunId(explicitRunId);
  const path = statePathFor(runId);
  if (!existsSync(path)) {
    fail(`Run state not found at ${path}. Run \`launch\` first.`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveState(state) {
  mkdirSync(stateDirFor(state.runId), { recursive: true });
  writeFileSync(statePathFor(state.runId), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  writeFileSync(LATEST_POINTER, `${state.runId}\n`, "utf8");
}

function extractOption(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${flag}`);
  args.splice(idx, 2);
  return value;
}

function extractFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return false;
  args.splice(idx, 1);
  return true;
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isTcpOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolveOpen) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveOpen(open);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

function checkRedisPing(redisUrl, timeoutMs = 1500) {
  return new Promise((resolvePing) => {
    let parsed;
    try {
      parsed = new URL(redisUrl);
    } catch {
      resolvePing(false);
      return;
    }
    const host = parsed.hostname || "127.0.0.1";
    const port = Number(parsed.port || 6379);
    const socket = net.createConnection({ host, port });
    let settled = false;
    let buf = "";
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePing(ok);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => {
      socket.write("PING\r\n");
    });
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.includes("+PONG")) finish(true);
    });
    socket.once("error", () => finish(false));
  });
}

async function getGitHead() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: REPO_ROOT,
    });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

function redactSecrets(text) {
  return String(text).replace(/(__clerk_ticket=)[^&\s"']+/g, "$1<redacted>");
}

function browserEnv() {
  const env = { ...process.env };
  // Chromium's SingletonSocket fails when TMPDIR / XDG_RUNTIME_DIR exceeds Unix socket limits (~108 bytes).
  if ((env.TMPDIR?.length ?? 0) > 40) env.TMPDIR = "/tmp";
  if ((env.XDG_RUNTIME_DIR?.length ?? 0) > 40) env.XDG_RUNTIME_DIR = "/tmp";
  return env;
}

async function runAgentBrowser(session, args, { json = false, allowFail = false } = {}) {
  const fullArgs = ["--session", session, ...(json ? ["--json"] : []), ...args];
  try {
    const { stdout, stderr } = await execFileAsync("agent-browser", fullArgs, {
      cwd: REPO_ROOT,
      env: browserEnv(),
      maxBuffer: 16 * 1024 * 1024,
    });
    if (json) {
      const parsed = JSON.parse(stdout);
      if (!parsed.success && !allowFail) {
        throw new Error(parsed.error || stdout || stderr);
      }
      return parsed;
    }
    return { stdout, stderr };
  } catch (error) {
    if (allowFail) return { ok: false, error };
    const detail = error?.stderr || error?.stdout || error?.message || String(error);
    throw new Error(
      `agent-browser ${redactSecrets(args.join(" "))} failed: ${redactSecrets(detail.trim())}`,
      { cause: error },
    );
  }
}

async function browserEval(session, expression) {
  const res = await runAgentBrowser(session, ["eval", expression], { json: true });
  return res.data?.result;
}

async function clerkRequest(secretKey, path, { method = "GET", body } = {}) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`https://api.clerk.com/v1${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.errors?.[0]?.long_message || data?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Clerk API ${method} ${path} failed: ${msg}`);
  }
  return data;
}

async function ensureVerifyClerkUser(env) {
  const secretKey = env.CLERK_SECRET_KEY;
  if (env.GB_VERIFY_CLERK_USER_ID) {
    const user = await clerkRequest(
      secretKey,
      `/users/${encodeURIComponent(env.GB_VERIFY_CLERK_USER_ID)}`,
    );
    const email = user.email_addresses?.[0]?.email_address ?? "custom-user";
    return { id: user.id, email };
  }
  const email = env.GB_VERIFY_CLERK_EMAIL || DEFAULT_VERIFY_EMAIL;
  const existing = await clerkRequest(
    secretKey,
    `/users?email_address=${encodeURIComponent(email)}`,
  );
  if (Array.isArray(existing) && existing.length > 0) {
    return { id: existing[0].id, email };
  }
  const created = await clerkRequest(secretKey, "/users", {
    method: "POST",
    body: {
      email_address: [email],
      first_name: "Verify",
      last_name: "Bot",
      skip_password_requirement: true,
      skip_password_checks: true,
    },
  });
  return { id: created.id, email };
}

async function waitForHttpReady(url, pid, logPath, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      const logTail = existsSync(logPath)
        ? readFileSync(logPath, "utf8").split(/\r?\n/).slice(-30).join("\n")
        : "";
      throw new Error(`Server process (${pid}) exited before becoming ready.\n${logTail}`);
    }
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 400) {
        return res.status;
      }
    } catch {
      // Server still starting.
    }
    await new Promise((resolveWait) => {
      setTimeout(resolveWait, 500);
    });
  }
  const logTail = existsSync(logPath)
    ? readFileSync(logPath, "utf8").split(/\r?\n/).slice(-30).join("\n")
    : "";
  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms.\n${logTail}`);
}

async function killProcessGroup(pid) {
  if (!isPidAlive(pid)) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && isPidAlive(pid)) {
    await new Promise((resolveWait) => {
      setTimeout(resolveWait, 150);
    });
  }
  if (isPidAlive(pid)) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already exited.
      }
    }
  }
}

async function listSessionsInBrowser(session) {
  const result = await browserEval(
    session,
    `(async () => {
      const res = await fetch("/api/sessions", { credentials: "same-origin" });
      if (!res.ok) return { ok: false, status: res.status, sessions: [] };
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.sessions ?? []);
      return { ok: true, status: res.status, sessions: list.map((s) => ({ id: s.id, name: s.name })) };
    })()`,
  );
  return result ?? { ok: false, status: 0, sessions: [] };
}

async function cmdLaunch(args) {
  const isDesign = extractFlag(args, "--design");
  const signedOut = extractFlag(args, "--signed-out");
  const skipMigrate = extractFlag(args, "--skip-migrate");
  const runId =
    extractOption(args, "--run-id") || `${Date.now()}-${randomBytes(2).toString("hex")}`;
  const portStr = extractOption(args, "--port");
  const port = portStr ? Number(portStr) : isDesign ? DEFAULT_DESIGN_PORT : DEFAULT_PORT;
  const viewport = extractOption(args, "--viewport") || "1440x900";
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    fail(`Invalid port: ${portStr}`);
  }
  const viewportMatch = /^(\d+)x(\d+)$/.exec(viewport);
  if (!viewportMatch) fail(`Invalid --viewport "${viewport}". Expected WxH such as 1440x900.`);
  const [, vpWidth, vpHeight] = viewportMatch;

  // Refuse to double-drive an already occupied port.
  if ((await isTcpOpen("127.0.0.1", port, 500)) || (await isTcpOpen("::1", port, 500))) {
    fail(
      `Port ${port} is already in use on localhost. Choose another port with --port <n> or stop the existing process first; verify-web refuses to double-drive an unknown server.`,
    );
  }

  const env = loadWebEnv();
  const baseUrl = `http://localhost:${port}`;
  const browserSession = `gb-verify-${runId}`;
  const stateDir = stateDirFor(runId);
  const evidenceDir = join(EVIDENCE_ROOT, runId);
  const logPath = join(stateDir, "server.log");
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });

  let serverPid = null;
  let browserOpened = false;

  try {
    let clerkUser = null;
    let redisUrl = env.REDIS_URL || DEFAULT_REDIS_URL;
    let redisReady = false;

    if (!isDesign) {
      const missing = [
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "DATABASE_URL",
      ].filter((key) => !env[key]);
      if (missing.length > 0) {
        throw new Error(
          `Missing required env vars in apps/web/.env.local: ${missing.join(", ")}. See apps/web/README.md.`,
        );
      }

      const dbUrl = new URL(env.DATABASE_URL);
      const dbHost = dbUrl.hostname || "127.0.0.1";
      const dbPort = Number(dbUrl.port || 5432);
      if (!(await isTcpOpen(dbHost, dbPort, 2000))) {
        throw new Error(
          `PostgreSQL is not reachable at ${dbHost}:${dbPort}. Start it with \`pnpm web db:start\` before launching.`,
        );
      }
      redisReady = await checkRedisPing(redisUrl, 1500);

      if (!skipMigrate) {
        await execFileAsync("pnpm", ["--filter", "@weng-lab/web", "db:migrate"], {
          cwd: REPO_ROOT,
          env: { ...env, DATABASE_URL: env.DATABASE_URL },
        });
      }

      if (!signedOut) {
        clerkUser = await ensureVerifyClerkUser(env);
      }
    }

    const logFd = openSync(logPath, "a");
    const spawnEnv = {
      ...env,
      REDIS_URL: redisUrl,
      VERCEL_DEPLOYMENT_ID: `verify-${runId}`,
    };
    const spawnArgs = isDesign
      ? [
          "--filter",
          "@weng-lab/web",
          "exec",
          "vite",
          "design",
          "--host",
          "localhost",
          "--port",
          String(port),
          "--strictPort",
        ]
      : [
          "--filter",
          "@weng-lab/web",
          "exec",
          "next",
          "dev",
          "--hostname",
          "localhost",
          "--port",
          String(port),
        ];

    const child = spawn("pnpm", spawnArgs, {
      cwd: REPO_ROOT,
      env: spawnEnv,
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });
    closeSync(logFd);
    serverPid = child.pid;
    child.unref();

    const readyUrl = isDesign ? baseUrl : `${baseUrl}/browser`;
    await waitForHttpReady(readyUrl, serverPid, logPath, 90_000);

    await runAgentBrowser(browserSession, ["set", "viewport", vpWidth, vpHeight], {
      allowFail: true,
    });
    let baselineSessionIds = [];

    if (isDesign) {
      await runAgentBrowser(browserSession, ["open", baseUrl]);
      browserOpened = true;
      await runAgentBrowser(browserSession, ["set", "viewport", vpWidth, vpHeight]);
      await runAgentBrowser(browserSession, ["wait", "--text", "Design"]);
    } else if (signedOut) {
      await runAgentBrowser(browserSession, ["open", `${baseUrl}/browser`]);
      browserOpened = true;
      await runAgentBrowser(browserSession, ["set", "viewport", vpWidth, vpHeight]);
      await runAgentBrowser(browserSession, [
        "wait",
        "--text",
        "Sign in to open and save sessions.",
      ]);
    } else {
      const signInToken = await clerkRequest(env.CLERK_SECRET_KEY, "/sign_in_tokens", {
        method: "POST",
        body: { user_id: clerkUser.id, expires_in_seconds: 300 },
      });
      await runAgentBrowser(browserSession, [
        "open",
        `${baseUrl}/sign-in?__clerk_ticket=${encodeURIComponent(signInToken.token)}`,
      ]);
      browserOpened = true;
      await runAgentBrowser(browserSession, ["set", "viewport", vpWidth, vpHeight]);
      // Wait for Clerk ticket sign-in to complete and land on /browser with Account controls hydrated.
      await runAgentBrowser(browserSession, [
        "wait",
        "--fn",
        `window.location.pathname.startsWith('/browser') && Boolean(document.querySelector('[aria-label="Account"]'))`,
      ]);
      const existing = await listSessionsInBrowser(browserSession);
      baselineSessionIds = existing.sessions.map((s) => s.id);
    }

    const state = {
      runId,
      mode: isDesign ? "design" : signedOut ? "signed-out" : "signed-in",
      pid: serverPid,
      port,
      baseUrl,
      browserSession,
      redisNamespace: `gb:verify-${runId}`,
      redisReady,
      clerkUserId: clerkUser?.id ?? null,
      clerkEmail: clerkUser?.email ?? null,
      baselineSessionIds,
      evidenceDir,
      logPath,
      worktree: REPO_ROOT,
      gitHead: await getGitHead(),
      startedAt: new Date().toISOString(),
    };
    saveState(state);
    console.log(JSON.stringify(state, null, 2));
  } catch (error) {
    if (browserOpened) {
      await runAgentBrowser(browserSession, ["close"], { allowFail: true });
    }
    if (serverPid) {
      await killProcessGroup(serverPid);
    }
    rmSync(stateDir, { recursive: true, force: true });
    const lockHint =
      !isDesign && existsSync(NEXT_DEV_LOCK)
        ? "\nHint: apps/web/.next/dev/lock exists — another `next dev` instance may already be running in this checkout."
        : "";
    fail(`${error.message}${lockHint}`);
  }
}

async function cmdDoctor(args) {
  const runId = extractOption(args, "--run-id");
  const state = loadState(runId);
  const env = loadWebEnv();
  const checks = [];
  let healthy = true;

  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    if (!ok) healthy = false;
  };

  const pidAlive = isPidAlive(state.pid);
  record(
    "server_pid",
    pidAlive,
    pidAlive ? `pid ${state.pid} alive` : `pid ${state.pid} is not running`,
  );

  let httpOk = false;
  let httpDetail = "";
  try {
    const target = state.mode === "design" ? state.baseUrl : `${state.baseUrl}/browser`;
    const res = await fetch(target, { redirect: "manual" });
    httpOk = res.status >= 200 && res.status < 400;
    httpDetail = `${target} -> HTTP ${res.status}`;
  } catch (error) {
    httpDetail = error.message;
  }
  record("http_ready", httpOk, httpDetail);

  if (state.mode !== "design") {
    const dbUrl = new URL(env.DATABASE_URL);
    const pgOk = await isTcpOpen(dbUrl.hostname || "127.0.0.1", Number(dbUrl.port || 5432), 1500);
    record(
      "postgres",
      pgOk,
      pgOk ? `${dbUrl.hostname}:${dbUrl.port || 5432} reachable` : "unreachable",
    );

    const redisUrl = env.REDIS_URL || DEFAULT_REDIS_URL;
    const redisOk = await checkRedisPing(redisUrl, 1500);
    checks.push({
      name: "redis",
      ok: redisOk,
      detail: redisOk
        ? `${redisUrl} PONG (remote control / MCP ready)`
        : `${redisUrl} unreachable (sessions still work; remote control / MCP unavailable)`,
    });
  }

  const headNow = await getGitHead();
  const headMatches = headNow === state.gitHead;
  checks.push({
    name: "git_head",
    ok: headMatches,
    detail: headMatches ? headNow : `launched at ${state.gitHead}, checkout is now ${headNow}`,
  });

  let currentUrl = "";
  try {
    const res = await runAgentBrowser(state.browserSession, ["get", "url"], { json: true });
    currentUrl = res.data?.url ?? "";
    const sameOrigin = currentUrl.startsWith(state.baseUrl);
    record("browser_session", sameOrigin, `session ${state.browserSession} at ${currentUrl}`);
  } catch (error) {
    record("browser_session", false, error.message);
  }

  if (state.mode === "signed-in" && currentUrl.startsWith(state.baseUrl)) {
    const authProbe = await listSessionsInBrowser(state.browserSession);
    record(
      "auth",
      authProbe.ok,
      authProbe.ok
        ? `signed in as ${state.clerkEmail} (${authProbe.sessions.length} saved session(s))`
        : `/api/sessions returned HTTP ${authProbe.status}`,
    );
  } else if (state.mode === "signed-out" && currentUrl.startsWith(state.baseUrl)) {
    const authProbe = await listSessionsInBrowser(state.browserSession);
    const isOut = authProbe.status === 401;
    record(
      "auth",
      isOut,
      isOut ? "signed out (/api/sessions -> 401)" : `unexpected status ${authProbe.status}`,
    );
  }

  const summary = {
    healthy,
    runId: state.runId,
    mode: state.mode,
    baseUrl: state.baseUrl,
    evidenceDir: state.evidenceDir,
    checks,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!healthy) process.exit(1);
}

async function cmdBrowser(args) {
  const runId = extractOption(args, "--run-id");
  const state = loadState(runId);
  const forwarded = args[0] === "--" ? args.slice(1) : args;
  if (forwarded.length === 0)
    fail("Usage: verify-web.mjs browser [--run-id <id>] <agent-browser args...>");
  const child = spawn("agent-browser", ["--session", state.browserSession, ...forwarded], {
    cwd: REPO_ROOT,
    env: browserEnv(),
    stdio: "inherit",
  });
  await new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("exit", (code) => {
      if (code === 0) resolveExit();
      else process.exit(code ?? 1);
    });
  });
}

function safeArtifactPath(evidenceDir, name, ext) {
  if (!name) fail("Missing artifact name.");
  const normalized = name.replace(/^\/+/, "");
  const fileName = normalized.endsWith(ext) ? normalized : `${normalized}${ext}`;
  const fullPath = resolve(evidenceDir, fileName);
  if (!fullPath.startsWith(resolve(evidenceDir))) {
    fail(`Artifact path must stay inside ${evidenceDir}`);
  }
  mkdirSync(dirname(fullPath), { recursive: true });
  return fullPath;
}

async function cmdScreenshot(args) {
  const runId = extractOption(args, "--run-id");
  const full = extractFlag(args, "--full");
  const annotate = extractFlag(args, "--annotate");
  const state = loadState(runId);
  const name = args[0];
  const outPath = safeArtifactPath(state.evidenceDir, name, ".png");
  const cmdArgs = [
    "screenshot",
    ...(full ? ["--full"] : []),
    ...(annotate ? ["--annotate"] : []),
    outPath,
  ];
  await runAgentBrowser(state.browserSession, cmdArgs);
  console.log(outPath);
}

async function cmdSnapshot(args) {
  const runId = extractOption(args, "--run-id");
  const full = extractFlag(args, "--full");
  const state = loadState(runId);
  const name = args[0];
  const outPath = safeArtifactPath(state.evidenceDir, name, ".aria.txt");
  const { stdout } = await runAgentBrowser(
    state.browserSession,
    full ? ["snapshot"] : ["snapshot", "-i"],
  );
  writeFileSync(outPath, stdout, "utf8");
  console.log(outPath);
}

async function cmdRecord(args) {
  const runId = extractOption(args, "--run-id");
  const state = loadState(runId);
  const sub = args[0];
  if (sub === "start") {
    const name = args[1];
    const outPath = safeArtifactPath(state.evidenceDir, name, ".webm");
    await runAgentBrowser(state.browserSession, ["record", "start", outPath]);
    console.log(outPath);
    return;
  }
  if (sub === "stop") {
    const { stdout } = await runAgentBrowser(state.browserSession, ["record", "stop"]);
    if (stdout.trim()) console.log(stdout.trim());
    return;
  }
  fail("Usage: verify-web.mjs record [--run-id <id>] start <name> | stop");
}

async function cmdMcpToken(args) {
  const runId = extractOption(args, "--run-id");
  const state = loadState(runId);
  if (state.mode !== "signed-in") {
    fail("mcp-token requires a signed-in verification run.");
  }
  const token = await browserEval(
    state.browserSession,
    `(async () => window.Clerk?.session ? await window.Clerk.session.getToken() : null)()`,
  );
  if (typeof token === "string" && token.length > 0) {
    process.stdout.write(`${token}\n`);
    return;
  }
  fail("Could not obtain a Clerk session token from the active browser tab.");
}

function listFilesRecursive(dir) {
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) entries.push(...listFilesRecursive(full));
    else entries.push({ path: full, bytes: st.size });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function cmdEvidence(args) {
  const runId = extractOption(args, "--run-id");
  const state = loadState(runId);
  const files = listFilesRecursive(state.evidenceDir);
  console.log(
    JSON.stringify({ runId: state.runId, evidenceDir: state.evidenceDir, files }, null, 2),
  );
}

async function cmdCleanup(args) {
  const runId = extractOption(args, "--run-id");
  const allVerifySessions = extractFlag(args, "--all-verify-sessions");
  const state = loadState(runId);

  const deletedSessions = [];
  if (state.mode === "signed-in" && isPidAlive(state.pid)) {
    try {
      const current = await listSessionsInBrowser(state.browserSession);
      const baseline = new Set(state.baselineSessionIds ?? []);
      const toDelete = current.sessions.filter((s) => allVerifySessions || !baseline.has(s.id));
      for (const session of toDelete) {
        const ok = await browserEval(
          state.browserSession,
          `(async () => {
            const res = await fetch(${JSON.stringify(`/api/sessions/${session.id}`)}, {
              method: "DELETE",
              credentials: "same-origin",
            });
            return res.ok;
          })()`,
        );
        if (ok) deletedSessions.push(session);
      }
    } catch (error) {
      console.error(`verify-web cleanup warning (session delete): ${error.message}`);
    }
  }

  await runAgentBrowser(state.browserSession, ["close"], { allowFail: true });
  await killProcessGroup(state.pid);

  rmSync(stateDirFor(state.runId), { recursive: true, force: true });
  if (existsSync(LATEST_POINTER) && readFileSync(LATEST_POINTER, "utf8").trim() === state.runId) {
    rmSync(LATEST_POINTER, { force: true });
  }

  const evidenceFiles = listFilesRecursive(state.evidenceDir);
  console.log(
    JSON.stringify(
      {
        cleanedRunId: state.runId,
        deletedSessions,
        evidenceDir: state.evidenceDir,
        evidenceFiles,
      },
      null,
      2,
    ),
  );
}

const [, , command, ...rest] = process.argv;
switch (command) {
  case "launch":
    await cmdLaunch(rest);
    break;
  case "doctor":
    await cmdDoctor(rest);
    break;
  case "browser":
    await cmdBrowser(rest);
    break;
  case "screenshot":
    await cmdScreenshot(rest);
    break;
  case "snapshot":
    await cmdSnapshot(rest);
    break;
  case "record":
    await cmdRecord(rest);
    break;
  case "mcp-token":
    await cmdMcpToken(rest);
    break;
  case "evidence":
    await cmdEvidence(rest);
    break;
  case "cleanup":
    await cmdCleanup(rest);
    break;
  case "-h":
  case "--help":
  case undefined:
    usage();
    break;
  default:
    fail(`Unknown command: ${command}`);
}
