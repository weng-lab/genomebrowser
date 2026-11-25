import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** Hosts that never resolve to real data, for examples and tests. */
const reserved =
  /(?:^|\.)(?:example\.(?:com|net|org)|example|test|invalid|localhost)$|^127\.0\.0\.1$/;

/**
 * Real hosts the repository already links to. Data URLs in docs, examples, and tests must use one
 * of these, a reserved host above, or `YOUR_URL_HERE`. Add a host only when it is real.
 */
export const knownHosts = new Set([
  // Weng Lab data and services
  "users.wenglab.org",
  "downloads.wenglab.org",
  "screen.api.wenglab.org",
  "console.wenglab.org",
  // UCSC
  "genome.ucsc.edu",
  "www.genome.ucsc.edu",
  "hgdownload.soe.ucsc.edu",
  // Specifications, tools, and services the docs and config reference
  "www.w3.org",
  "json-schema.org",
  "github.com",
  "cli.github.com",
  "developer.mozilla.org",
  "react.doctor",
  "vite.dev",
  "v2-11-7.turborepo.dev",
  "zod.dev",
  "zustand.docs.pmnd.rs",
  "models.opencode.ai",
  "vercel.com",
  "oidc.vercel.com",
  "openapi.vercel.sh",
  "docs.cloud.google.com",
  "iamcredentials.googleapis.com",
  "sts.googleapis.com",
  "www.googleapis.com",
  "api.clerk.com",
]);

/** Lists `[path, host]` for URLs in `files` (path to text) whose host is neither reserved nor known. */
export function findUnknownHosts(files) {
  const unknown = [];
  for (const [path, text] of files) {
    for (const [, host] of text.matchAll(/\bhttps?:\/\/([A-Za-z0-9.-]+)/g)) {
      const name = host.toLowerCase().replace(/\.$/, "");
      if (!reserved.test(name) && !knownHosts.has(name)) unknown.push([path, name]);
    }
  }
  return unknown;
}

if (import.meta.main) {
  const paths = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--",
      "*.md",
      "*.ts",
      "*.tsx",
      "*.js",
      "*.mjs",
      "*.json",
      "*.yml",
      "*.yaml",
      "*.html",
      ":!:legacy/**",
      ":!:pnpm-lock.yaml",
      ":!:tools/lint/url-hosts.mjs",
      ":!:tools/lint/policy.test.mjs",
    ],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter((path) => path && existsSync(path));
  const unknown = findUnknownHosts(
    new Map(paths.map((path) => [path, readFileSync(path, "utf8")])),
  );
  if (unknown.length > 0) {
    console.error(
      "These URLs use a host the repository does not know. In examples, docs, and tests, use",
      "YOUR_URL_HERE, a reserved host such as example.test, or a URL already in the repository.",
      "If the host is real and needed, add it to knownHosts in tools/lint/url-hosts.mjs:\n",
    );
    for (const [path, host] of unknown) console.error(`  ${path}: ${host}`);
    process.exit(1);
  }
}
