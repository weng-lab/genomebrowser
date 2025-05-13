import { useState } from "react";

import { useContextMenuStore } from "../../store/contestMenuStore";
import { trackComponents } from "../tracks/displayTrack";
import { DisplayMode, useTrackStore } from "../../store/trackStore";
import { useEffect, useRef } from "react";

export default function ContextMenu() {
  const { open, id, x, y, setContextMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const track = useTrackStore((state) => state.getTrack(id || ""));
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const [hovered, setHovered] = useState<DisplayMode | null>(null);

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

  const handleClick = (mode: DisplayMode) => {
    if (!id) return;
    setContextMenu(false, id, x, y);
    updateTrack(id, "displayMode", mode);
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
      {options.map((mode) => {
        return (
          <div
            key={mode}
            style={{
              background: getBackground(currentMode, hovered, mode),
              padding: 5,
              cursor: hovered === mode ? "pointer" : "default",
            }}
            onMouseEnter={() => setHovered(mode)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(mode)}
          >
            {mode}
          </div>
        );
      })}
    </div>
  );
}

const getBackground = (currentMode: DisplayMode, hovered: DisplayMode | null, mode: DisplayMode) => {
  if (currentMode === mode) {
    return "gray";
  }
  if (hovered === mode) {
    return "lightgray";
  }
  return "white";
};
