import { execFileSync } from "node:child_process";
import { extname } from "node:path";

/**
 * Lists groups of paths that macOS and Windows treat as the same name. Besides exact paths and
 * their directories, it compares paths without their final extension, because an extensionless
 * import such as `./RemoteControl` resolves `remoteControl.ts` there before `RemoteControl.tsx`.
 * Directories are reported with a trailing slash.
 */
export function findCaseCollisions(paths) {
  const names = new Map();
  const add = (name, label) => {
    const key = name.toLowerCase();
    if (!names.has(key)) names.set(key, new Map());
    const spellings = names.get(key);
    if (!spellings.has(name)) spellings.set(name, new Set());
    spellings.get(name).add(label);
  };
  for (const path of paths) {
    add(path, path);
    add(path.slice(0, path.length - extname(path).length), path);
    for (let i = path.indexOf("/"); i !== -1; i = path.indexOf("/", i + 1)) {
      add(path.slice(0, i), path.slice(0, i + 1));
    }
  }
  const groups = new Map();
  for (const spellings of names.values()) {
    if (spellings.size < 2) continue;
    const group = [...new Set([...spellings.values()].flatMap((labels) => [...labels]))].sort();
    groups.set(group.join("\0"), group);
  }
  return [...groups.values()];
}

if (import.meta.main) {
  const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
  const collisions = findCaseCollisions(paths.filter(Boolean));
  if (collisions.length > 0) {
    console.error(
      "These tracked names differ only in letter case, ignoring file extensions. Case-insensitive",
      "file systems, the default on macOS and Windows, treat each group as one name, so imports",
      "and checkouts can resolve to the wrong file. Rename one name in each group:\n",
    );
    for (const group of collisions) console.error(`  ${group.join("  ")}`);
    process.exit(1);
  }
}
