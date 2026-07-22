import type { BrowserRegion } from "@weng-lab/genomebrowser";

export const cytobandQuery = `
  query Cytobands($assembly: String!, $chromosome: String) {
    cytoband(assembly: $assembly, chromosome: $chromosome) {
      stain
      coordinates {
        chromosome
        start
        end
      }
    }
  }
`;

export type cytoband = {
  stain: string;
  coordinates: BrowserRegion;
};

export type cytobandData = {
  bands: cytoband[];
  extent: BrowserRegion;
};

export type cytobandRequest = {
  endpoint: string;
  assembly: string;
  chromosome: string;
};

type cacheRecord =
  | {
      status: "pending";
      promise: Promise<cytobandData | null>;
      controller: AbortController;
      consumers: number;
    }
  | { status: "complete"; data: cytobandData | null };

const maximumCompletedRequests = 32;
const requestCache = new Map<string, cacheRecord>();

export function acquireCytobands(request: cytobandRequest) {
  const key = getRequestKey(request);
  const cached = requestCache.get(key);
  if (cached?.status === "complete") {
    return { promise: Promise.resolve(cached.data), release: () => {} };
  }
  if (cached?.status === "pending") {
    cached.consumers += 1;
    return { promise: cached.promise, release: createRelease(key, cached) };
  }

  const controller = new AbortController();
  const record: cacheRecord & { status: "pending" } = {
    status: "pending",
    controller,
    consumers: 1,
    promise: Promise.resolve(null),
  };
  record.promise = fetchCytobands(request, controller.signal).then(
    (data) => {
      if (requestCache.get(key) === record) {
        requestCache.set(key, { status: "complete", data });
        evictCompletedRequests();
      }
      return data;
    },
    (error: unknown) => {
      if (requestCache.get(key) === record) requestCache.delete(key);
      throw error;
    },
  );
  requestCache.set(key, record);
  return { promise: record.promise, release: createRelease(key, record) };
}

function createRelease(key: string, record: cacheRecord & { status: "pending" }) {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    record.consumers -= 1;
    if (record.consumers === 0 && requestCache.get(key) === record) {
      requestCache.delete(key);
      record.controller.abort();
    }
  };
}

function evictCompletedRequests() {
  let completedRequests = 0;
  for (const record of requestCache.values()) {
    if (record.status === "complete") completedRequests += 1;
  }

  if (completedRequests <= maximumCompletedRequests) return;
  for (const [key, record] of requestCache) {
    if (record.status !== "complete") continue;
    requestCache.delete(key);
    completedRequests -= 1;
    if (completedRequests <= maximumCompletedRequests) return;
  }
}

function getRequestKey({ endpoint, assembly, chromosome }: cytobandRequest) {
  return JSON.stringify([endpoint, assembly, chromosome]);
}

async function fetchCytobands(
  { endpoint, assembly, chromosome }: cytobandRequest,
  signal: AbortSignal,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: cytobandQuery,
      variables: { assembly: normalizeRequestAssembly(assembly), chromosome },
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Cytoband request failed with ${response.status}`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Cytoband response was malformed");
  }
  if (!isRecord(payload)) throw new Error("Cytoband response was malformed");

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const messages = payload.errors.map((error) =>
      isRecord(error) && typeof error.message === "string" ? error.message : "GraphQL error",
    );
    throw new Error(messages.join("; "));
  }
  if (!isRecord(payload.data) || !Array.isArray(payload.data.cytoband)) {
    throw new Error("Cytoband response was malformed");
  }

  return normalizeCytobands(payload.data.cytoband, chromosome);
}

function normalizeRequestAssembly(assembly: string) {
  return assembly === "GRCh38" || assembly === "GRCH38" || assembly === "hg38" ? "hg38" : assembly;
}

function normalizeCytobands(values: unknown[], requestedChromosome: string): cytobandData | null {
  if (values.length === 0) return null;

  const bands = values.flatMap((value): cytoband[] => {
    if (!isRecord(value) || typeof value.stain !== "string" || !isRecord(value.coordinates)) {
      return [];
    }
    const { chromosome, start, end } = value.coordinates;
    if (
      typeof chromosome !== "string" ||
      chromosome.length === 0 ||
      chromosome !== requestedChromosome ||
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= end
    ) {
      return [];
    }
    return [{ stain: value.stain, coordinates: { chromosome, start, end } }];
  });

  if (bands.length === 0) throw new Error("Cytoband response contained no valid bands");
  bands.sort(
    (left, right) =>
      left.coordinates.start - right.coordinates.start ||
      left.coordinates.end - right.coordinates.end ||
      left.stain.localeCompare(right.stain),
  );

  const start = Math.min(...bands.map((band) => band.coordinates.start));
  const end = Math.max(...bands.map((band) => band.coordinates.end));
  return { bands, extent: { chromosome: requestedChromosome, start, end } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
