import { describe, expect, it } from "vitest";
import { createTrackResourceStore } from "../../src/browser/data/trackResourceStore";

describe("trackResourceStore", () => {
  it("stores, reads, deletes, and clears values for one track scope", () => {
    const store = createTrackResourceStore();
    const resources = store.resourcesFor({ type: "bigwig", id: "signal" });

    expect(resources.get("file")).toBeUndefined();
    resources.set("file", { name: "reader" });
    expect(resources.get("file")).toEqual({ name: "reader" });

    resources.delete("file");
    expect(resources.get("file")).toBeUndefined();

    resources.set("a", 1);
    resources.set("b", 2);
    resources.clear();
    expect(resources.get("a")).toBeUndefined();
    expect(resources.get("b")).toBeUndefined();
  });

  it("isolates tracks of the same type and same IDs of different types", () => {
    const store = createTrackResourceStore();
    const signal = store.resourcesFor({ type: "bigwig", id: "signal" });
    const otherSignal = store.resourcesFor({ type: "bigwig", id: "other-signal" });
    const genes = store.resourcesFor({ type: "bigbed", id: "signal" });

    signal.set("file", "signal-reader");
    expect(otherSignal.get("file")).toBeUndefined();
    expect(genes.get("file")).toBeUndefined();

    otherSignal.set("file", "other-reader");
    genes.set("file", "genes-reader");
    expect(signal.get("file")).toBe("signal-reader");
    expect(otherSignal.get("file")).toBe("other-reader");
    expect(genes.get("file")).toBe("genes-reader");
  });

  it("keeps values for active tracks and releases removed tracks", () => {
    const store = createTrackResourceStore();
    const signal = store.resourcesFor({ type: "bigwig", id: "signal" });
    const genes = store.resourcesFor({ type: "bigwig", id: "genes" });
    signal.set("file", "signal-reader");
    genes.set("file", "genes-reader");

    store.retain([
      { type: "bigwig", id: "signal" },
      { type: "bigwig", id: "variants" },
    ]);
    expect(signal.get("file")).toBe("signal-reader");
    expect(genes.get("file")).toBeUndefined();

    // A removed track that returns starts empty, not with its old values.
    const returning = store.resourcesFor({ type: "bigwig", id: "genes" });
    expect(returning.get("file")).toBeUndefined();
  });

  it("keeps browser instances isolated from each other", () => {
    const first = createTrackResourceStore();
    const second = createTrackResourceStore();
    first.resourcesFor({ type: "bigwig", id: "signal" }).set("file", "first-reader");

    expect(second.resourcesFor({ type: "bigwig", id: "signal" }).get("file")).toBeUndefined();

    first.clear();
    expect(first.resourcesFor({ type: "bigwig", id: "signal" }).get("file")).toBeUndefined();
  });
});
