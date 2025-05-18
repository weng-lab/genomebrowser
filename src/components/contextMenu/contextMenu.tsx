import { useEffect, useRef, useState } from "react";
import { useContextMenuStore } from "../../store/contestMenuStore";
import { useTrackStore } from "../../store/trackStore";
import { trackComponents } from "../tracks/displayTrack";
import { DisplayMode } from "../tracks/types";

export default function ContextMenu() {
  const { open, id, x, y, setContextMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const track = useTrackStore((state) => state.getTrack(id || ""));
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
  const currentMode = track.displayMode;
  const items = trackComponents[track.trackType];
  const options = Object.keys(items) as DisplayMode[];

  const handleClick = (mode: string) => {
    if (!id) return;
    setContextMenu(false, id, x, y);
    if (mode === "hide") {
      removeTrack(id);
    } else if (mode === "download") {
      // downloadTrack(id);
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
