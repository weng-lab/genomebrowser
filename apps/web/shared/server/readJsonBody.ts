import "server-only";

/**
 * Read a request's JSON body of at most `maxBytes`. A chunked body has no
 * declared length, so bytes are counted as they arrive and reading stops at the
 * limit. Throws `tooLarge()` past the limit and `invalid()` for malformed JSON.
 */
export async function readJsonBody(
  request: Request,
  {
    maxBytes,
    tooLarge,
    invalid,
  }: { maxBytes: number; tooLarge: () => Error; invalid: () => Error },
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw invalid();
  }
}
