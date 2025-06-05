import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import useDebounce from "../../../hooks/useDebounce";
import { Track, useTrackStore } from "../../../store/trackStore";
import Form from "./form";

export default function UniversalForm({ track }: { track: Track }) {
  const [title, setTitle] = useState(track.title);
  const editTrack = useTrackStore((state) => state.editTrack);

  const debouncedTitle = useDebounce(title, 500);
  useEffect(() => {
    editTrack(track.id, { title: debouncedTitle });
  }, [debouncedTitle, editTrack, track.id]);

  const handleColorChange = (color: string) => {
    editTrack(track.id, { color });
  };

  return (
    <Form title="">
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "5px" }}>
        <div style={{ fontWeight: "bold" }}>Color: </div>
        <ColorPicker color={track.color || ""} onChange={handleColorChange} />
        <div style={{ fontWeight: "bold" }}>Title: </div>
        <input id="titleInput" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
    </Form>
  );
}

function ColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);
  const swatchStyle = {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    border: "3px solid #fff",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
    backgroundColor: color,
  };

  const popoverStyle = {
    position: "absolute" as const,
    top: "calc(100% + 2px)",
    left: "0",
    borderRadius: "9px",
    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={swatchStyle} onClick={() => setIsOpen(!isOpen)} />
      {isOpen && (
        <div ref={popoverRef} style={popoverStyle}>
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
