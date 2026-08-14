const nativeFetch = globalThis.fetch.bind(globalThis);
const runId = crypto.randomUUID();
let requestNumber = 0;

export type ReaderName = "new" | "old";

export type RequestContext = {
  dataset: string;
  mode: "cold" | "warm";
  size: number;
  sample: number;
  phase: "measure" | "prime";
};

let requestContext: RequestContext | undefined;

export async function withRequestContext<Value>(
  context: RequestContext,
  operation: () => Promise<Value>,
): Promise<Value> {
  requestContext = context;
  try {
    return await operation();
  } finally {
    requestContext = undefined;
  }
}

export function cacheBustedUrl(rawUrl: string, reader: ReaderName): string {
  const url = new URL(rawUrl);
  url.searchParams.set("gbReader", reader);
  url.searchParams.set("gbRequest", `${runId}-${++requestNumber}`);
  if (requestContext !== undefined) {
    url.searchParams.set("gbDataset", requestContext.dataset);
    url.searchParams.set("gbMode", requestContext.mode);
    url.searchParams.set("gbSize", String(requestContext.size));
    url.searchParams.set("gbSample", String(requestContext.sample));
    url.searchParams.set("gbPhase", requestContext.phase);
  }
  return url.href;
}

export function installRangeCacheBuster(): void {
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (!request.headers.has("Range")) return nativeFetch(request);

    const url = new URL(request.url);
    if (url.searchParams.has("gbReader")) return nativeFetch(request);

    return nativeFetch(new Request(cacheBustedUrl(url.href, "new"), request));
  };
}
