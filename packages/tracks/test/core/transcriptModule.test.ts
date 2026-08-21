import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackResources } from "@weng-lab/genomebrowser";
import { defaultScreenGraphQlEndpoint } from "@weng-lab/genomebrowser";
import { transcriptModule } from "../../src/transcript";

const endpoint = "/api/screen-graphql";

function createTrackResources(): TrackResources {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Transcript module", () => {
  it("defines tooltip UI on the module", () => {
    const config = transcriptModule.create({
      id: "genes",
      title: "Genes",
      config: {
        assembly: "GRCh38",
        version: 40,
      },
    });

    expect(transcriptModule.tooltipComponent).toBeTypeOf("function");
    expect(config).not.toHaveProperty("tooltip");
    expect(config.config.endpoint).toBe(defaultScreenGraphQlEndpoint);
    expect(config.config).toMatchObject({
      canonicalColor: "#000000",
      highlightColor: "#000000",
      rowHeight: 12,
    });
  });

  it("posts to its host-owned endpoint without credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { gene: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const data = await transcriptModule.fetch({
      track: {
        id: "genes",
        type: "transcript",
        display: "full",
        config: {
          endpoint,
          assembly: "GRCh38",
          version: 40,
          canonicalColor: "#000000",
          highlightColor: "#000000",
          rowHeight: 12,
        },
      },
      demand: {
        assembly: { id: "GRCh38", chromosomes: { chr6: 170_805_979 } },
        region: { chromosome: "chr6", start: 10, end: 20 },
        width: 100,
      },
      resources: createTrackResources(),
    });

    expect(data).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestEndpoint, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestEndpoint).toBe(endpoint);
    expect(options.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(String(options.body))).toMatchObject({
      variables: {
        assembly: "GRCh38",
        chromosome: "chr6",
        start: 10,
        end: 20,
        version: 40,
      },
    });
  });

  it("rejects an empty endpoint", () => {
    expect(() =>
      transcriptModule.create({
        id: "genes",
        title: "Genes",
        config: { endpoint: " ", assembly: "GRCh38", version: 40 },
      }),
    ).toThrow();
  });

  it("rejects non-hexadecimal transcript colors", () => {
    expect(() =>
      transcriptModule.create({
        id: "genes",
        title: "Genes",
        config: {
          assembly: "GRCh38",
          version: 40,
          canonicalColor: "rebeccapurple",
        },
      }),
    ).toThrow(/six-digit hexadecimal color/);
    expect(() =>
      transcriptModule.create({
        id: "genes",
        title: "Genes",
        config: {
          assembly: "GRCh38",
          version: 40,
          highlightColor: "#abc",
        },
      }),
    ).toThrow(/six-digit hexadecimal color/);
  });

  it.each([
    [
      "HTTP failures",
      { ok: false, status: 503, json: async () => ({}) },
      "Transcript request failed with 503",
    ],
    [
      "GraphQL failures",
      { ok: true, status: 200, json: async () => ({ errors: [{ message: "Query failed" }] }) },
      "Query failed",
    ],
  ])("reports %s", async (_name, response, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(
      transcriptModule.fetch({
        track: {
          id: "genes",
          type: "transcript",
          display: "full",
          config: {
            endpoint,
            assembly: "GRCh38",
            version: 40,
            canonicalColor: "#000000",
            highlightColor: "#000000",
            rowHeight: 12,
          },
        },
        demand: {
          assembly: { id: "GRCh38", chromosomes: { chr6: 170_805_979 } },
          region: { chromosome: "chr6", start: 10, end: 20 },
          width: 100,
        },
        resources: createTrackResources(),
      }),
    ).rejects.toThrow(message);
  });
});
