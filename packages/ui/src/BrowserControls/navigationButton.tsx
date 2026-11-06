import Button, { type ButtonProps } from "@mui/material/Button";
import {
  canPan,
  canZoom,
  type BrowserStore,
  type BrowserStoreInstance,
} from "@weng-lab/genomebrowser";

export type NavigationAction = { type: "pan"; fraction: number } | { type: "zoom"; factor: number };

export type NavigationButtonProps = Omit<ButtonProps, "action" | "onClick"> & {
  browserStore: BrowserStoreInstance;
  action: NavigationAction;
};

export function NavigationButton({
  action,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  browserStore,
  disabled = false,
  ...buttonProps
}: NavigationButtonProps) {
  const useBrowserStore = browserStore;
  const navigationDisabled = useBrowserStore((state) => !canNavigate(state, action));
  const resolvedAriaLabel = ariaLabel || (ariaLabelledBy ? undefined : getActionName(action));

  function handleClick() {
    const state = useBrowserStore.getState();
    if (disabled || !canNavigate(state, action)) return;
    if (action.type === "zoom") state.zoom(action.factor);
    else state.pan(action.fraction);
  }

  return (
    <Button
      {...buttonProps}
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled || navigationDisabled}
      onClick={handleClick}
    />
  );
}

function canNavigate(state: BrowserStore, action: NavigationAction) {
  return action.type === "pan" ? canPan(state, action.fraction) : canZoom(state, action.factor);
}

function getActionName(action: NavigationAction) {
  if (action.type === "pan") {
    if (action.fraction < 0) return "Pan left";
    if (action.fraction > 0) return "Pan right";
    return "Pan";
  }

  if (action.factor < 1) return "Zoom in";
  if (action.factor > 1) return "Zoom out";
  return "Zoom";
}
