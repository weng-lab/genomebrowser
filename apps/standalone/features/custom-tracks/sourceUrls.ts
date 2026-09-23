export function validateSourceUrls(config: Record<string, unknown>) {
  const urls: string[] = [];
  function visit(value: unknown, key = "") {
    if (typeof value === "string" && (key === "url" || key === "sequenceUrl")) {
      if (value && (!URL.canParse(value) || !/^https?:$/.test(new URL(value).protocol))) {
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
