import { useEffect, useRef, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { useModalStore } from "../../store/modalStore";
import { useTrackStore } from "../../store/trackStore";
import { TrackType } from "../tracks/types";
import UniversalForm from "./shared/base";
import Display from "./shared/display";
import Height from "./shared/height";
import TranscriptForm from "./transcript/version";
import Range from "./bigWig/range";
import GeneName from "./transcript/geneName";
import { DownloadForm } from "./shared/download";
import Gap from "./bulkbed/gap";
import DatasetList from "./bulkbed/datasetList";

export default function Modal() {
  const { id, open, closeModal, position } = useModalStore();
  const [dragPos, setDragPos] = useState(position);
  const [dragging, setDragging] = useState(false);

  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    e.preventDefault();
    setDragPos({ x: data.x, y: data.y });
    setDragging(true);
  };

  useEffect(() => {
    if (!open) return;
    setDragPos(position);
  }, [open, position]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal]);

  const track = useTrackStore((state) => state.getTrack(id));
  const modalRef = useRef<HTMLDivElement>(null);

  if (!track) return null;
  if (!open) return null;
  return (
    <Draggable
      handle=".modal-handle"
      position={dragPos}
      onDrag={handleDrag}
      onStop={() => setDragging(false)}
      nodeRef={modalRef as unknown as React.RefObject<HTMLElement>}
    >
      <div
        ref={modalRef}
        style={{
          width: "auto",
          height: "auto",
          backgroundColor: "white",
          position: "fixed",
          top: 0,
          left: 0,
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
          transform: "translate(-50%, -50%)",
          background: "#ffffff",
        }}
      >
        <div
          className="modal-handle"
          style={{
            backgroundColor: track.color || "white",
            color: getTextColor(track.color || "white"),
            cursor: dragging ? "grabbing" : "grab",
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <CloseButton handleClose={closeModal} color={getTextColor(track.color || "transparent")} />
          <div style={{ margin: "10px" }}>
            <div style={{ paddingBottom: "0px", fontSize: "1.2em", fontWeight: "bold" }}>
              Configure {track.shortLabel || track.title}
            </div>
          </div>
        </div>
        <ModalContent id={id} />
      </div>
    </Draggable>
  );
}

function ModalContent({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id));
  if (!track) return "no configuration available";
  const forms = (() => {
    switch (track.trackType) {
      case TrackType.BigWig:
        return <Range id={id} defaultRange={track.range} customRange={track.customRange} />;
      case TrackType.BigBed:
        return <></>;
      case TrackType.Transcript:
        return (
          <>
            <TranscriptForm track={track} />
            <GeneName id={id} name={track.geneName || ""} />
          </>
        );
      case TrackType.Motif:
        return <></>;
      case TrackType.Importance:
        return <></>;
      case TrackType.LDTrack:
        return <></>;
      case TrackType.BulkBed:
        return (
          <>
            <Gap id={id} defaultGap={track.gap || 0} />
            <DatasetList datasets={track.datasets || []} />
          </>
        );
      default:
        return <></>;
    }
  })();
  return (
    <>
      <UniversalForm track={track} />
      <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
        <Height id={id} defaultHeight={track.height} />
        <Display id={track.id} trackType={track.trackType} />
      </div>
      {forms}
      <DownloadForm track={track} />
    </>
  );
}

function CloseButton({ handleClose, color }: { handleClose: () => void; color: string }) {
  const dimensions = "25px";
  return (
    <svg
      style={{ color: color, fontSize: dimensions, cursor: "pointer", position: "absolute", top: "5px", right: "5px" }}
      onClick={handleClose}
      width={dimensions}
      height={dimensions}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z"
        fill={color}
      />
    </svg>
  );
}

export function getTextColor(backgroundColor: string): string {
  // Handle empty or invalid colors
  if (!backgroundColor) return "#000000";
  // Remove # from string
  const hex = backgroundColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate relative luminance using sRGB colors
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use white text for darker backgrounds, black for lighter ones
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function shadeColor(color: string, percent: number) {
  var R = parseInt(color.substring(1, 3), 16);
  var G = parseInt(color.substring(3, 5), 16);
  var B = parseInt(color.substring(5, 7), 16);

  R = (R * (100 + percent)) / 100;
  G = (G * (100 + percent)) / 100;
  B = (B * (100 + percent)) / 100;

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  R = Math.round(R);
  G = Math.round(G);
  B = Math.round(B);

  var RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
  var GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
  var BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

  return "#" + RR + GG + BB;
}

export const isDark = (color: string) => {
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};