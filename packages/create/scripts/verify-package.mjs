import { execFileSync } from "node:child_process";

const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
  encoding: "utf8",
});
const [pack] = JSON.parse(output);
const paths = new Set(pack.files.map((file) => file.path));

for (const requiredPath of [
  "dist/create.js",
  "template/.env.example",
  "template/_gitignore",
  "template/CLAUDE.md",
  "template/package.json",
  "template/src/App.tsx",
]) {
  if (!paths.has(requiredPath)) throw new Error(`Package is missing ${requiredPath}`);
}

for (const filePath of paths) {
  if (
    filePath.startsWith("template/node_modules/") ||
    filePath.startsWith("template/dist/") ||
    filePath.startsWith("template/.turbo/")
  ) {
    throw new Error(`Package contains generated template file ${filePath}`);
  }
}

console.log(`Verified ${paths.size} packed files and the generator executable.`);
