import { ResizablePanel } from "./ResizablePanel";
import { SidePanel } from "./SidePanel";
import type { Side, SidePanel as SidePanelDefinition } from "../types";
import { type SidePanelState, sidePanelSizes } from "./useSidePanel";

type SidePanelSlotProps = {
  side: Side;
  /** The current page's panel on this side, if it has one. */
  panel: SidePanelDefinition | undefined;
  state: SidePanelState;
};

/**
 * One side of the frame. The slot stays mounted when the page has no panel on this side, so
 * its width and the content's state carry across pages. Page changes swap it instantly;
 * only the panel toggle animates it.
 */
export function SidePanelSlot({ side, panel, state }: SidePanelSlotProps) {
  return (
    <ResizablePanel
      id={`${side}-panel`}
      side={side}
      open={panel !== undefined && state.open}
      width={state.width}
      onWidthChange={state.setWidth}
      animate={state.animating}
      onAnimationEnd={state.endAnimation}
      {...sidePanelSizes[side]}
      resizeLabel={`Resize ${side} panel`}
    >
      {panel && (
        <SidePanel title={panel.title} side={side}>
          <panel.content />
        </SidePanel>
      )}
    </ResizablePanel>
  );
}
