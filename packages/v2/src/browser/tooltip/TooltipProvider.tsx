import { useEffect, useMemo, type ReactNode } from "react";
import type { TrackConfigBase, TrackTooltipComponent } from "../../modules/types";
import { TooltipContextProvider } from "./TooltipContext";
import { createTooltipStore } from "./tooltipStore";

export function TooltipProvider({
  children,
  disabled,
  getTooltipComponent,
}: {
  children: ReactNode;
  disabled: boolean;
  getTooltipComponent: (type: string) => TrackTooltipComponent<any, TrackConfigBase> | undefined;
}) {
  const store = useMemo(() => createTooltipStore(), []);

  useEffect(() => {
    if (disabled) store.getState().hide();
  }, [disabled, store]);

  return (
    <TooltipContextProvider
      store={store}
      disabled={disabled}
      getTooltipComponent={getTooltipComponent}
    >
      {children}
    </TooltipContextProvider>
  );
}
