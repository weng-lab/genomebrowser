import { useEffect, useRef, useState } from "react";
import { useContextMenuStore, useTrackStore, useDataStore } from "../../store/BrowserContext";
import { trackComponents } from "../tracks/displayTrack";
import { DisplayMode, TrackType } from "../tracks/types";
import { CustomTrackConfig } from "../tracks/custom/types";
import { downloadSVG } from "../../utils/download";

export default function ContextMenu() {
  const open = useContextMenuStore((state) => state.open);
  const id = useContextMenuStore((state) => state.id);
  const x = useContextMenuStore((state) => state.x);
  const y = useContextMenuStore((state) => state.y);
  const setContextMenu = useContextMenuStore((state) => state.setContextMenu);
  const menuRef = useRef<HTMLDivElement>(null);
  const track = useTrackStore((state) => state.getTrack(id || ""));
  const trackDataState = useDataStore((state) => state.trackData.get(id || ""));
  const editTrack = useTrackStore((state) => state.editTrack);
  const removeTrack = useTrackStore((state) => state.removeTrack);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(false, id || "", x, y);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setContextMenu, id, x, y]);

  if (!track) return null;
  if (!trackDataState || trackDataState.data === null) return null;
  const currentMode = track.displayMode;
  const items =
    track.trackType === TrackType.Custom ? (track as CustomTrackConfig).renderers : trackComponents[track.trackType];
  const options = Object.keys(items) as DisplayMode[];

  const handleClick = (mode: string) => {
    if (!id) return;
    setContextMenu(false, id, x, y);
    if (mode === "remove") {
      removeTrack(id);
    } else if (mode === "download") {
      downloadSVG(id, track.title, true);
    } else {
      editTrack(id, { displayMode: mode as DisplayMode });
    }
  };

  return (
    <div
      ref={menuRef}
      id="context-menu"
      style={{
        visibility: open ? "visible" : "hidden",
        position: "fixed",
        top: y,
        left: x,
        boxShadow: "0 0 5px 0 rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
      }}
    >
      {options.map((mode) => (
        <OptionButton
          key={mode}
          mode={mode}
          currentMode={currentMode}
          hovered={hovered}
          setHovered={setHovered}
          handleClick={handleClick}
        />
      ))}
      <OptionButton
        mode={"remove"}
        currentMode={currentMode}
        hovered={hovered}
        setHovered={setHovered}
        handleClick={handleClick}
      />
      <OptionButton
        mode={"download"}
        currentMode={currentMode}
        hovered={hovered}
        setHovered={setHovered}
        handleClick={handleClick}
      />
    </div>
  );
}

function OptionButton({
  mode,
  currentMode,
  hovered,
  setHovered,
  handleClick,
}: {
  mode: string;
  currentMode: string;
  hovered: string | null;
  setHovered: (hovered: string | null) => void;
  handleClick: (mode: string) => void;
}) {
  return (
    <div
      key={mode}
      style={{
        background: currentMode === mode ? "#d0d0d0" : hovered === mode ? "#f0f0f0" : "#ffffff",
        padding: 5,
        cursor: hovered === mode ? "pointer" : "default",
        fontSize: 12,
      }}
      onMouseEnter={() => setHovered(mode)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => handleClick(mode)}
    >
      {mode}
    </div>
  );
}
