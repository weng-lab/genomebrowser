import { useWorkspacePreferences } from "../preferences";
import { ResizablePanel } from "./ResizablePanel";
import { SidePanel } from "./SidePanel";
import type { Side, WorkspacePanel as SidePanelDefinition } from "../types";

/** Width policy belongs to the persistent slot that owns each side's size. */
const sidePanelSizes = {
  left: { defaultWidth: 240, minWidth: 180, maxWidth: 480 },
  right: { defaultWidth: 360, minWidth: 280, maxWidth: 720 },
} satisfies Record<Side, { defaultWidth: number; minWidth: number; maxWidth: number }>;

type SidePanelSlotProps = {
  side: Side;
  /** The current page's panel on this side, if it has one. */
  panel: SidePanelDefinition | undefined;
  open: boolean;
  animate: boolean;
};

/** A page's panel slot reads its persistent width from the workspace preferences. */
export function SidePanelSlot({ side, panel, open, animate }: SidePanelSlotProps) {
  const width = useWorkspacePreferences((state) =>
    side === "left" ? state.leftWidth : state.rightWidth,
  );
  const setWidth = useWorkspacePreferences((state) => state.setWidth);
  return (
    <ResizablePanel
      id={`${side}-panel`}
      side={side}
      open={panel !== undefined && open}
      width={width}
      onWidthChange={(width) => setWidth(side, width)}
      animate={animate}
      {...sidePanelSizes[side]}
      resizeLabel={`Resize ${side} panel`}
    >
      {panel && (
        <SidePanel title={panel.title} side={side}>
          {panel.children}
        </SidePanel>
      )}
    </ResizablePanel>
  );
}
