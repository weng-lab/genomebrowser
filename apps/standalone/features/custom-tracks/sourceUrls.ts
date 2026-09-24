import { isHttpUrl } from "@/lib/urls";

/** Collect the set source URLs in a config. Throws for a URL that is not HTTP or HTTPS. */
export function collectSourceUrls(config: Record<string, unknown>) {
  const urls: string[] = [];
  function visit(value: unknown, key = "") {
    if (typeof value === "string" && (key === "url" || key === "sequenceUrl")) {
      if (value && !isHttpUrl(value)) {
        throw new Error("Enter a complete HTTP or HTTPS source URL and click Set.");
      }
      if (value) urls.push(value);
    } else if (value && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
    }
  }
  visit(config);
  return urls;
}
