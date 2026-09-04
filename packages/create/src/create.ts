#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const templateDirectory = fileURLToPath(new URL("../template", import.meta.url));
const excludedNames = new Set(["dist", "node_modules", ".turbo"]);

export interface CreateProjectOptions {
  templateDirectory?: string;
}

export async function createProject(
  target: string,
  options: CreateProjectOptions = {},
): Promise<string> {
  const targetDirectory = path.resolve(target);
  await assertEmptyTarget(targetDirectory);
  await mkdir(targetDirectory, { recursive: true });

  await cp(options.templateDirectory ?? templateDirectory, targetDirectory, {
    recursive: true,
    filter(source) {
      return !excludedNames.has(path.basename(source));
    },
  });

  await renameTemplateGitignore(targetDirectory);
  await preparePackageManifest(targetDirectory);
  return targetDirectory;
}

async function assertEmptyTarget(targetDirectory: string): Promise<void> {
  try {
    const entries = await readdir(targetDirectory);
    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDirectory}`);
    }
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
}

async function renameTemplateGitignore(targetDirectory: string): Promise<void> {
  const source = path.join(targetDirectory, "_gitignore");
  try {
    await rename(source, path.join(targetDirectory, ".gitignore"));
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
}

async function preparePackageManifest(targetDirectory: string): Promise<void> {
  const manifestPath = path.join(targetDirectory, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    name: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  manifest.name = packageNameFromDirectory(targetDirectory);
  stripWorkspaceProtocols(manifest.dependencies);
  stripWorkspaceProtocols(manifest.devDependencies);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function stripWorkspaceProtocols(dependencies?: Record<string, string>): void {
  if (!dependencies) return;
  for (const [name, version] of Object.entries(dependencies)) {
    dependencies[name] = version.replace(/^workspace:/, "");
  }
}

function packageNameFromDirectory(targetDirectory: string): string {
  const name = path
    .basename(targetDirectory)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9~!$&'()*+,;=:@._-]+/g, "-");
  return name || "genomebrowser-app";
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function usage(): string {
  return "Usage: create-genomebrowser <project-directory>";
}

async function main(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }

  const target = args[0];
  if (!target || args.length > 1) {
    throw new Error(usage());
  }

  const targetDirectory = await createProject(target);
  const relativeTarget = path.relative(process.cwd(), targetDirectory) || ".";
  console.log(`Created a genome browser app in ${relativeTarget}`);
  console.log(`\n  cd ${relativeTarget}\n  npm install\n  npm run dev`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(realpathSync(invokedPath)).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
