import { defaultScreenGraphQlEndpoint } from "@weng-lab/genomebrowser";
import { useEffect, useId, useState } from "react";
import { acquireCytobands, type cytobandData } from "./cytobandData";
import type { CytobandColors, CytobandsProps } from "./cytobandsTypes";
import { cytobandSvg as CytobandSvg } from "./cytobandSvg";
import { highlightLayer as HighlightLayer } from "./highlightLayer";
import { currentRegionBracket as CurrentRegionBracket } from "./currentRegionBracket";

export type { CytobandColors, CytobandsProps } from "./cytobandsTypes";

type requestState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "empty" }
  | { key: string; status: "ready"; data: cytobandData };

const defaultColors: CytobandColors = {
  negative: "#ffffff",
  positive: "#111111",
  variable: "#8c8c8c",
  stalk: "#d95f5f",
  centromere: "#9e2a2b",
  unknown: "#b8b8b8",
};

const emptyHighlights: NonNullable<CytobandsProps["highlights"]> = [];

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

export function Cytobands({
  assembly,
  chromosome,
  width,
  height,
  endpoint = defaultScreenGraphQlEndpoint,
  colors,
  highlights = emptyHighlights,
  currentRegion,
  renderHighlightTooltip,
  onHighlightClick,
  onHighlightPointerEnter,
  onHighlightPointerLeave,
}: CytobandsProps) {
  const requestKey = JSON.stringify([endpoint, assembly, chromosome]);
  const [state, setState] = useState<requestState>({ key: requestKey, status: "loading" });
  const clipId = `chromosome-ideogram-${useId().replaceAll(":", "")}`;
  const renderedWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const renderedHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  const currentState: requestState =
    state.key === requestKey ? state : { key: requestKey, status: "loading" };
  const statusMessage = currentState.status === "ready" ? "" : getStatusMessage(currentState);

  useEffect(() => {
    let active = true;
    const request = acquireCytobands({ endpoint, assembly, chromosome });
    void request.promise.then(
      (data) => {
        if (!active) return;
        setState(
          data ? { key: requestKey, status: "ready", data } : { key: requestKey, status: "empty" },
        );
      },
      (error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Cytoband request failed";
        setState({ key: requestKey, status: "error", message });
      },
    );
    return () => {
      active = false;
      request.release();
    };
  }, [assembly, chromosome, endpoint, requestKey]);

  return (
    <>
      <svg
        aria-label={`Chromosome ${chromosome} ideogram`}
        height={renderedHeight}
        role={onHighlightClick || currentRegion ? "group" : "img"}
        style={{ display: "block", overflow: "visible" }}
        viewBox={`0 0 ${renderedWidth} ${renderedHeight}`}
        width={renderedWidth}
      >
        {currentState.status === "ready" ? (
          <>
            <CytobandSvg
              clipId={clipId}
              colors={{ ...defaultColors, ...colors }}
              data={currentState.data}
              height={renderedHeight}
              width={renderedWidth}
            />
            <HighlightLayer
              chromosome={currentState.data.extent.chromosome}
              clipId={clipId}
              extentEnd={currentState.data.extent.end}
              extentStart={currentState.data.extent.start}
              height={renderedHeight}
              highlights={highlights}
              onHighlightClick={onHighlightClick}
              onHighlightPointerEnter={onHighlightPointerEnter}
              onHighlightPointerLeave={onHighlightPointerLeave}
              renderHighlightTooltip={renderHighlightTooltip}
              width={renderedWidth}
            />
            <CurrentRegionBracket
              chromosome={currentState.data.extent.chromosome}
              currentRegion={currentRegion}
              extentEnd={currentState.data.extent.end}
              extentStart={currentState.data.extent.start}
              height={renderedHeight}
              width={renderedWidth}
            />
          </>
        ) : (
          <Status height={renderedHeight} message={statusMessage} width={renderedWidth} />
        )}
      </svg>
      <span aria-live="polite" role="status" style={visuallyHidden}>
        {statusMessage}
      </span>
    </>
  );
}

function Status({ width, height, message }: { width: number; height: number; message: string }) {
  return (
    <text
      dominantBaseline="middle"
      fill="#333333"
      fontFamily="sans-serif"
      fontSize={Math.min(14, Math.max(8, height * 0.65))}
      textAnchor="middle"
      x={width / 2}
      y={height / 2}
    >
      {message}
    </text>
  );
}

function getStatusMessage(state: Exclude<requestState, { status: "ready" }>) {
  if (state.status === "loading") return "Loading chromosome ideogram…";
  if (state.status === "empty") return "No cytoband data";
  return `Unable to load cytobands: ${state.message}`;
}
