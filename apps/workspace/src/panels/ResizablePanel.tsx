import Box from "@mui/material/Box";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type TransitionEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ResizablePanelProps = {
  id: string;
  /** Which edge of the workspace the panel is anchored to. The handle sits on the opposite edge. */
  side: "left" | "right";
  open: boolean;
  /** Owned by the caller so the width can outlive this panel, such as across page changes. */
  width: number;
  onWidthChange: (width: number) => void;
  /** Animate the next open or close. When false, the panel opens and closes instantly. */
  animate: boolean;
  /** Called when an open or close animation finishes or is interrupted. */
  onAnimationEnd: () => void;
  /** Restored by double-clicking the handle. */
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** Accessible name for the resize handle. */
  resizeLabel: string;
  children: ReactNode;
};

type Drag = {
  pointerId: number;
  target: HTMLElement;
  startX: number;
  startWidth: number;
  pendingX: number;
  frame: number | null;
};

const KEYBOARD_STEP = 16;

function endDrag(drag: RefObject<Drag | null>) {
  const active = drag.current;
  if (!active) return;
  // Clear first: releasing capture can synchronously dispatch lostpointercapture.
  drag.current = null;
  if (active.frame !== null) cancelAnimationFrame(active.frame);
  if (active.target.hasPointerCapture(active.pointerId)) {
    active.target.releasePointerCapture(active.pointerId);
  }
  document.body.style.removeProperty("cursor");
  document.body.style.removeProperty("user-select");
}

/**
 * A side panel the user can resize by dragging its interior edge or with the arrow keys
 * on that edge. Opening and closing animate its width when `animate` is set. A closed panel stays mounted so its
 * contents keep their state, but it is inert and hidden from assistive technology.
 */
export function ResizablePanel({
  id,
  side,
  open,
  width,
  onWidthChange,
  animate,
  onAnimationEnd,
  defaultWidth,
  minWidth,
  maxWidth,
  resizeLabel,
  children,
}: ResizablePanelProps) {
  const [resizing, setResizing] = useState(false);
  const drag = useRef<Drag | null>(null);
  // Dragging toward the workspace center widens the panel.
  const direction = side === "left" ? 1 : -1;
  const clamp = (value: number) => Math.min(maxWidth, Math.max(minWidth, value));
  const setWidth = (value: number) => onWidthChange(clamp(value));

  const applyPendingWidth = () => {
    const active = drag.current;
    if (!active) return;
    setWidth(active.startWidth + (active.pendingX - active.startX) * direction);
  };

  // Window blur and unmount can interrupt a drag without a pointerup.
  useEffect(() => {
    const onBlur = () => {
      endDrag(drag);
      setResizing(false);
    };
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
      endDrag(drag);
    };
  }, []);

  const stopDrag = () => {
    endDrag(drag);
    setResizing(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || drag.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      startX: event.clientX,
      startWidth: width,
      pendingX: event.clientX,
      frame: null,
    };
    // Keep the resize cursor and prevent text selection while the pointer leaves the handle.
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    setResizing(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    active.pendingX = event.clientX;
    // Resize at most once per frame; the browser re-renders on every width change.
    if (active.frame !== null) return;
    active.frame = requestAnimationFrame(() => {
      active.frame = null;
      applyPendingWidth();
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    active.pendingX = event.clientX;
    applyPendingWidth();
    stopDrag();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const keyDirection = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (keyDirection !== undefined) {
      event.preventDefault();
      setWidth(width + keyDirection * direction * KEYBOARD_STEP);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setWidth(event.key === "Home" ? minWidth : maxWidth);
    }
  };

  const panelWidth = clamp(width);

  // Ignore transitions from the contents and the handle, and the visibility transition.
  const endWidthAnimation = (event: TransitionEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && event.propertyName === "width") onAnimationEnd();
  };

  return (
    <Box
      id={id}
      inert={!open}
      aria-hidden={!open}
      onTransitionEnd={endWidthAnimation}
      onTransitionCancel={endWidthAnimation}
      sx={(theme) => {
        const { duration, easing } = theme.transitions;
        return {
          position: "relative",
          flexShrink: 0,
          width: open ? panelWidth : 0,
          visibility: open ? "visible" : "hidden",
          // Visibility flips immediately on open and after the width animation on close.
          transition:
            !animate || resizing
              ? "none"
              : `width ${duration.shorter}ms ${easing.easeInOut}, visibility 0ms linear ${open ? 0 : duration.shorter}ms`,
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        };
      }}
    >
      {/* Clips the full-width contents while the panel animates, so they slide instead of reflowing. */}
      <Box
        sx={{
          display: "flex",
          justifyContent: side === "left" ? "flex-end" : "flex-start",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            width: panelWidth,
            minHeight: 0,
            [side === "left" ? "borderRight" : "borderLeft"]: 1,
            borderColor: "divider",
          }}
        >
          {children}
        </Box>
      </Box>
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
        aria-controls={id}
        aria-valuenow={panelWidth}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onDoubleClick={() => setWidth(defaultWidth)}
        onKeyDown={onKeyDown}
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          // An 8px hit area centered on the panel border.
          [side === "left" ? "right" : "left"]: -4,
          width: 8,
          zIndex: 1,
          cursor: "col-resize",
          touchAction: "none",
          outline: "none",
          "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 3,
            width: 2,
            transition: "background-color 150ms",
          },
          "&:hover::after, &:focus-visible::after": { bgcolor: "divider" },
          "&:active::after": { bgcolor: "primary.main" },
        }}
      />
    </Box>
  );
}
