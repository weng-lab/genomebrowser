import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createProject } from "../src/create.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
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
