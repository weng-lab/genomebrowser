import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createFixtureServer } from "./server.mjs";
import { bigwig } from "./bigwig.e2e.mjs";
import { dynseq } from "./dynseq.e2e.mjs";
import { navigation } from "../../../core/test/browser/navigation.e2e.mjs";

const exec = promisify(execFile);
const scenarios = { bigwig, navigation, dynseq };
const selected = process.argv.slice(2);
for (const name of selected) assert.ok(name in scenarios, `Unknown scenario: ${name}`);
let failed = false;
for (const name of selected.length ? selected : Object.keys(scenarios)) {
  const requests = [];
  const commands = [];
  const directory = fileURLToPath(new URL(`../../test-results/browser/${name}/`, import.meta.url));
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const config = `${directory}config.json`;
  await writeFile(config, "{}");
  const session = `genomebrowser-${name}-${process.pid}`;
  const server = await createFixtureServer(requests);
  async function browser(...args) {
    commands.push(args);
    const { stdout } = await exec(
      "agent-browser",
      [
        "--config",
        config,
        "--session",
        session,
        "--headed",
        "false",
        "--allowed-domains",
        "127.0.0.1",
        "--json",
        ...args,
      ],
      {
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([key]) => !key.startsWith("AGENT_BROWSER_")),
          ),
          AGENT_BROWSER_DEFAULT_TIMEOUT: "10000",
        },
        timeout: 60000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    const result = JSON.parse(stdout);
    assert.equal(result.success, true, stdout);
    return result.data;
  }
  const evaluate = async (source) => (await browser("eval", source)).result;
  let passed = false;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    await browser("set", "viewport", "1000", "800");
    await browser("trace", "start");
    await scenarios[name]({ browser, evaluate, requests, origin });
    const errors = await browser("errors");
    assert.deepEqual(errors.errors, [], "Unexpected browser errors");
    const consoleOutput = await browser("console");
    assert.deepEqual(
      consoleOutput.messages.filter((message) => message.type === "error"),
      [],
      "Unexpected console errors",
    );
    passed = true;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL: ${name}`, error);
    await writeFile(`${directory}failure.txt`, String(error.stack ?? error));
    // Artifact collection must not obscure the original failure or prevent cleanup.
    for (const args of [["screenshot", `${directory}failure.png`], ["errors"], ["console"]]) {
      try {
        const result = await browser(...args);
        await writeFile(`${directory}${args[0]}.json`, JSON.stringify(result, null, 2));
      } catch (artifactError) {
        console.error(`Could not capture ${args[0]}:`, artifactError.message);
      }
    }
  } finally {
    try {
      await browser("trace", "stop", `${directory}trace.json`);
    } catch (error) {
      console.error("Could not save trace:", error.message);
      failed = true;
      passed = false;
    }
    await writeFile(`${directory}commands.json`, JSON.stringify({ commands, requests }, null, 2));
    await browser("close").catch((error) => console.error(error.message));
    await server.close();
    if (passed) await rm(directory, { recursive: true, force: true });
  }
}
if (failed) process.exitCode = 1;
