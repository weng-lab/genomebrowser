import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  useContextMenuStore,
  useTrackMutationGate,
  useTrackStore,
} from "../state/browserContextState";
import { useRegistry } from "../state/useRegistry";

export function ContextMenuController() {
  const registry = useRegistry();
  const open = useContextMenuStore((state) => state.open);
  const trackId = useContextMenuStore((state) => state.trackId);
  const position = useContextMenuStore((state) => state.position);
  const closeContextMenu = useContextMenuStore((state) => state.closeContextMenu);
  const track = useTrackStore((state) => (trackId ? state.getTrack(trackId) : undefined));
  const updateBase = useTrackStore((state) => state.updateBase);
  const removeTrack = useTrackStore((state) => state.removeTrack);
  const { isInteractionBlocked, runTrackMutation } = useTrackMutationGate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      closeContextMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeContextMenu, open]);

  if (!open || !track || !trackId) return null;

  let displayOptions: string[] = [];
  try {
    displayOptions = Object.keys(registry.get(track.type).render);
  } catch {
    displayOptions = [];
  }

  const handleDisplayClick = (display: string) => {
    if (runTrackMutation(() => updateBase(trackId, { display })).ok) closeContextMenu();
  };

  const handleRemoveClick = () => {
    if (runTrackMutation(() => removeTrack(trackId)).ok) closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      style={{ ...menuStyle, left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {displayOptions.map((display) => (
        <MenuButton
          key={display}
          label={display}
          selected={track.base.display === display}
          hovered={hoveredItem === display}
          disabled={isInteractionBlocked}
          onHover={() => setHoveredItem(display)}
          onLeave={() => setHoveredItem(null)}
          onClick={() => handleDisplayClick(display)}
        />
      ))}
      {displayOptions.length > 0 && <div style={separatorStyle} />}
      <MenuButton
        label="remove"
        hovered={hoveredItem === "remove"}
        disabled={isInteractionBlocked}
        onHover={() => setHoveredItem("remove")}
        onLeave={() => setHoveredItem(null)}
        onClick={handleRemoveClick}
      />
    </div>
  );
}

function MenuButton({
  label,
  selected = false,
  hovered = false,
  disabled = false,
  onHover,
  onLeave,
  onClick,
}: {
  label: string;
  selected?: boolean;
  hovered?: boolean;
  disabled?: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        ...buttonStyle,
        background: selected ? "#d0d0d0" : hovered && !disabled ? "#f0f0f0" : "#ffffff",
        color: disabled ? "#888888" : "#000000",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      disabled={disabled}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const menuStyle = {
  position: "fixed",
  background: "#ffffff",
  boxShadow: "0 0 5px 0 rgba(0, 0, 0, 0.5)",
  zIndex: 20,
  fontSize: "12px",
} satisfies CSSProperties;

const buttonStyle = {
  display: "block",
  width: "100%",
  padding: "5px",
  border: "none",
  background: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "12px",
} satisfies CSSProperties;

const separatorStyle = {
  height: "1px",
  background: "#cccccc",
} satisfies CSSProperties;
