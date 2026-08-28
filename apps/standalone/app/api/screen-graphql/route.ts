import "server-only";

const screenGraphQlEndpoint = "https://screen.api.wenglab.org/graphql";

export async function POST(request: Request) {
  const headers = new Headers({ "content-type": "application/json" });
  const apiKey = process.env.SCREEN_API_KEY;

  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }

  const upstreamResponse = await fetch(screenGraphQlEndpoint, {
    method: "POST",
    headers,
    body: await request.arrayBuffer(),
    cache: "no-store",
  });
  const responseHeaders = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");

  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
