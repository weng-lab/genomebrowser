import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, test } from "vitest";
import { createProject } from "../src/create.js";

const temporaryDirectories: string[] = [];
const execute = promisify(execFile);

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("CLI", () => {
  test.each([false, true])(
    "creates a project through the executable (symlink: %s)",
    async (linked) => {
      const root = await temporaryDirectory();
      const sourceDirectory = path.join(root, "src");
      await mkdir(sourceDirectory);
      const source = path.join(sourceDirectory, "create.ts");
      await cp(path.resolve(import.meta.dirname, "../src/create.ts"), source);
      await cp(fixtureTemplate(), path.join(root, "template"), { recursive: true });
      const executable = linked ? path.join(root, "create-genomebrowser") : source;
      if (linked) await symlink(source, executable);

      const { stdout, stderr } = await execute(process.execPath, [executable, "my-browser"], {
        cwd: root,
      });

      expect(stdout).toContain("Created a genome browser app in my-browser");
      expect(stderr).toBe("");
      const manifest = JSON.parse(
        await readFile(path.join(root, "my-browser/package.json"), "utf8"),
      );
      expect(manifest.name).toBe("my-browser");
      expect(await readFile(path.join(root, "my-browser/.gitignore"), "utf8")).toContain(
        "node_modules",
      );
    },
  );
});

describe("createProject", () => {
  test("copies and prepares an installable project", async () => {
    const root = await temporaryDirectory();
    const target = path.join(root, "My Browser");
    const template = path.join(root, "template");
    await cp(fixtureTemplate(), template, { recursive: true });
    await mkdir(path.join(template, "dist"), { recursive: true });
    await writeFile(path.join(template, "dist", "excluded"), "excluded");

    await createProject(target, { templateDirectory: template });

    const manifest = JSON.parse(await readFile(path.join(target, "package.json"), "utf8")) as {
      name: string;
      dependencies: Record<string, string>;
    };
    expect(manifest.name).toBe("my-browser");
    expect(manifest.dependencies["@weng-lab/genomebrowser"]).toBe("^2.0.0-alpha.1");
    expect(await readFile(path.join(target, ".gitignore"), "utf8")).toContain("node_modules");
    await expect(readFile(path.join(target, "_gitignore"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(readFile(path.join(target, "dist", "excluded"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  test("accepts an existing empty directory", async () => {
    const root = await temporaryDirectory();
    const target = path.join(root, "empty");
    await mkdir(target);

    await expect(createProject(target, { templateDirectory: fixtureTemplate() })).resolves.toBe(
      target,
    );
  });

  test("does not overwrite a non-empty directory", async () => {
    const root = await temporaryDirectory();
    const target = path.join(root, "existing");
    await mkdir(target);
    await writeFile(path.join(target, "keep.txt"), "keep");

    await expect(createProject(target, { templateDirectory: fixtureTemplate() })).rejects.toThrow(
      "Target directory is not empty",
    );
    expect(await readFile(path.join(target, "keep.txt"), "utf8")).toBe("keep");
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "create-genomebrowser-"));
  temporaryDirectories.push(directory);
  return directory;
}

function fixtureTemplate(): string {
  return path.resolve(import.meta.dirname, "fixtures/template");
}
