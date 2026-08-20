import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultScreenGraphQlEndpoint } from "@weng-lab/genomebrowser";
import { transcriptModule } from "../../src/transcript";

const endpoint = "/api/screen-graphql";

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
      config: {
        endpoint,
        assembly: "GRCh38",
        version: 40,
        canonicalColor: "#000000",
        highlightColor: "#000000",
        rowHeight: 12,
      },
      region: { chromosome: "chr6", start: 10, end: 20 },
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
        config: {
          endpoint,
          assembly: "GRCh38",
          version: 40,
          canonicalColor: "#000000",
          highlightColor: "#000000",
          rowHeight: 12,
        },
        region: { chromosome: "chr6", start: 10, end: 20 },
      }),
    ).rejects.toThrow(message);
  });
});
