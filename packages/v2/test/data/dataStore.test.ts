import { describe, expect, it } from "vitest";
import { createDataStore } from "../../src/data/dataStore";

describe("createDataStore", () => {
  it("starts empty", () => {
    const useDataStore = createDataStore();

    expect(useDataStore.getState().data).toEqual({});
  });

  it("replaces data", () => {
    const useDataStore = createDataStore();

    useDataStore.getState().setData({ signal: { status: "success", data: [1] } });
    useDataStore.getState().setData({ annotation: { status: "error", error: "Failed" } });

    expect(useDataStore.getState().data).toEqual({
      annotation: { status: "error", error: "Failed" },
    });
  });

  it("sets and clears one track", () => {
    const useDataStore = createDataStore();

    useDataStore.getState().setTrackData("signal", { status: "success", data: [1] });
    useDataStore.getState().setTrackData("annotation", { status: "success", data: [2] });
    useDataStore.getState().clearTrack("signal");

    expect(useDataStore.getState().data).toEqual({
      annotation: { status: "success", data: [2] },
    });
  });

  it("clears all data", () => {
    const useDataStore = createDataStore();

    useDataStore.getState().setTrackData("signal", { status: "success", data: [1] });
    useDataStore.getState().clearAll();

    expect(useDataStore.getState().data).toEqual({});
  });
});
