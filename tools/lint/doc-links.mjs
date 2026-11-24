import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

/** GitHub's heading anchor: lowercase, punctuation removed, spaces as hyphens. */
export function headingSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

const withoutFences = (markdown) => markdown.replace(/^(```|~~~)[\s\S]*?^\1/gm, "");
const withoutCode = (markdown) => withoutFences(markdown).replace(/`[^`\n]*`/g, "");

export function anchorsOf(markdown) {
  const anchors = new Set();
  const seen = new Map();
  for (const [, heading] of withoutFences(markdown).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = headingSlug(heading);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return anchors;
}

/**
 * Lists relative links in `files` (path to Markdown text) whose file or heading does not exist.
 * `exists(path)` reports whether a path outside `files` exists.
 */
export function findBrokenLinks(files, exists) {
  const broken = [];
  const anchorCache = new Map();
  const anchors = (path) => {
    if (!anchorCache.has(path)) anchorCache.set(path, anchorsOf(files.get(path)));
    return anchorCache.get(path);
  };
  for (const [path, markdown] of files) {
    for (const [, target] of withoutCode(markdown).matchAll(/\]\(\s*<?([^)\s>]+)>?[^)]*\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [file, anchor] = target.split("#");
      const resolved = file ? normalize(join(dirname(path), decodeURI(file))) : path;
      if (files.has(resolved)) {
        if (anchor && !anchors(resolved).has(anchor)) broken.push([path, target]);
      } else if (!exists(resolved)) {
        broken.push([path, target]);
      }
    }
  }
  return broken;
}

if (import.meta.main) {
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.md", ":!:legacy/**"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter((path) => path && existsSync(path));
  const files = new Map(paths.map((path) => [path, readFileSync(path, "utf8")]));
  const broken = findBrokenLinks(files, existsSync);
  if (broken.length > 0) {
    console.error("These Markdown links point to a file or heading that does not exist:\n");
    for (const [path, target] of broken) console.error(`  ${path}: ${target}`);
    process.exit(1);
  }
}
