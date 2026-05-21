import { describe, expect, it } from "vitest";
import { createTrackIdsSignature } from "./dataController";

describe("track data dependencies", () => {
  const signalTrack = {
    id: "signal",
    type: "bigwig",
    title: "Signal",
    display: "full",
    height: 80,
  };
  const annotationTrack = {
    id: "annotation",
    type: "bigbed",
    title: "Annotation",
    display: "dense",
    height: 60,
  };

  it("does not depend on track order", () => {
    expect(createTrackIdsSignature([signalTrack, annotationTrack])).toBe(
      createTrackIdsSignature([annotationTrack, signalTrack]),
    );
  });

  it("changes when tracks are added or removed", () => {
    expect(createTrackIdsSignature([signalTrack])).not.toBe(
      createTrackIdsSignature([signalTrack, annotationTrack]),
    );
  });
});
