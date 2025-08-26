import { useEffect, useRef, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { useModalStore, useTrackStore } from "../../store/BrowserContext";
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
import { getTextColor } from "./helpers";

export default function Modal() {
  const id = useModalStore((state) => state.id);
  const open = useModalStore((state) => state.open);
  const closeModal = useModalStore((state) => state.closeModal);
  const position = useModalStore((state) => state.position);

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

