/** Forward the local browser protocol to the persistent relay. */
export async function proxyBrowserApi(request: Request, path: string[]) {
  const route = path.join("/");
  if (!/^(events|clients|clients\/[0-9a-f-]+\/(region|results|session))$/.test(route)) {
    return Response.json({ error: "Unknown browser API route" }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  const incoming = new URL(request.url);
  const host = request.headers.get("host");
  // Next may normalize request.url to localhost. Host retains the browser's
  // authority; forwarded-host headers must not override this origin check.
  let expectedOrigin: string | null = incoming.origin;
  if (host !== null) {
    try {
      if (!/^(?:[a-zA-Z0-9.-]+|\[[0-9a-fA-F:.]+\])(?::\d+)?$/.test(host)) {
        throw new Error("Invalid Host header");
      }
      expectedOrigin = new URL(`${incoming.protocol}//${host}`).origin;
    } catch {
      expectedOrigin = null;
    }
  }
  const hostname = expectedOrigin ? new URL(expectedOrigin).hostname : null;
  if (!hostname || !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    return Response.json({ error: "Browser API is local-only" }, { status: 403 });
  }

  if (origin !== null && origin !== expectedOrigin) {
    return Response.json(
      { error: "Cross-origin browser API requests are not allowed" },
      { status: 403 },
    );
  }

  const serverUrl = process.env.GB_SERVER_URL ?? "http://127.0.0.1:3001";
  const target = new URL(`/api/browser/${route}`, serverUrl);
  const headers = new Headers();
  for (const name of ["content-type", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "POST" ? request.body : undefined,
      signal: request.signal,
      cache: "no-store",
      // Node's fetch requires duplex when forwarding a streaming request body.
      ...({ duplex: "half" } as { duplex: "half" }),
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json({ error: "Browser server is unavailable" }, { status: 503 });
  }
}
