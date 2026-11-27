/** Parse JSON safely, returning `undefined` on malformed input instead of throwing. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
