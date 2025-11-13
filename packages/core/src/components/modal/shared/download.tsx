import { useState } from "react";
import { downloadBedRegion, downloadBedGraph, downloadSVG } from "../../../utils/download";
import { TrackType } from "../../tracks/types";
import Form from "./form";
import { getTextColor, isDark, shadeColor } from "../helpers";
import { useBrowserStore, useDataStore } from "../../../store/BrowserContext";
import { Track } from "../../../store/trackStore";

export const downloadButtonStyle = {
  cursor: "pointer",
  outline: 0,
  color: "#fff",
  borderColor: "#FFFFFF",
  border: "none",
  borderRadius: "5px",
  display: "inline-block",
  textAlign: "center" as const,
  padding: "6px 12px",
};

export function DownloadForm({ track }: { track: Track }) {
  const getDomain = useBrowserStore((state) => state.getExpandedDomain);
  const trackDataState = useDataStore((state) => state.trackData.get(track.id || ""));
  const domain = getDomain();
  const bgCol = track.color || "#ffffff";
  const isBackgroundDark = isDark(bgCol);
  const bgColHover = shadeColor(bgCol, isBackgroundDark ? 30 : -30);
  const fontCol = getTextColor(bgCol);

  const data = trackDataState?.data ?? undefined;

  const handleRegionData = () => {
    if (track.trackType === TrackType.BigWig) {
      downloadBedGraph(track.id, data, domain);
    } else if (track.trackType === TrackType.BigBed) {
      downloadBedRegion(track.id, data, domain);
    }
  };

  const handleRegionSVG = () => {
    downloadSVG(track.id, track.title, true);
  };

  const handleDataURL = () => {
    if (track.trackType === TrackType.BigWig) {
      navigator.clipboard.writeText(track.url || "");
      alert("Copied URL to clipboard!");
    }
  };
  const [hover, setHover] = useState(-1);
  return (
    <Form title="Download">
      <div>
        <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
          {track.trackType === TrackType.BigWig || track.trackType === TrackType.BigBed ? (
            <button
              style={{
                ...downloadButtonStyle,
                backgroundColor: hover === 0 ? bgColHover : bgCol,
                color: fontCol,
              }}
              onMouseEnter={() => {
                setHover(0);
              }}
              onMouseLeave={() => {
                setHover(-1);
              }}
              onClick={handleRegionData}
            >
              Locus Data
            </button>
          ) : null}
          <button
            style={{
              ...downloadButtonStyle,
              backgroundColor: hover === 1 ? bgColHover : bgCol,
              color: fontCol,
            }}
            onMouseEnter={() => {
              setHover(1);
            }}
            onMouseLeave={() => {
              setHover(-1);
            }}
            onClick={handleRegionSVG}
          >
            Locus SVG
          </button>
          {track.trackType === TrackType.BigWig || (track.trackType === TrackType.BigBed && track.url) ? (
            <button
              style={{
                ...downloadButtonStyle,
                backgroundColor: hover === 2 ? bgColHover : bgCol,
                color: fontCol,
              }}
              onMouseEnter={() => {
                setHover(2);
              }}
              onMouseLeave={() => {
                setHover(-1);
              }}
              onClick={handleDataURL}
            >
              Copy File URL
            </button>
          ) : null}
        </div>
      </div>
    </Form>
  );
}
