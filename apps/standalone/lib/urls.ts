/** Source URLs must be absolute HTTP or HTTPS URLs; no file uploads or other schemes. */
export function isHttpUrl(value: string) {
  return URL.canParse(value) && /^https?:$/.test(new URL(value).protocol);
}
