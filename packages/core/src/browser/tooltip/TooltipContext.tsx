import { useMemo, type ReactNode } from "react";
import type { AnyTrackTooltipComponent } from "../../modules/types";
import type { TooltipStoreInstance } from "./tooltipStore";
import { TooltipContext } from "./tooltipContextState";

export function TooltipContextProvider({
  children,
  isDisabled,
  getTooltipComponent,
  store,
}: {
  children: ReactNode;
  isDisabled: () => boolean;
  getTooltipComponent: (type: string) => AnyTrackTooltipComponent | undefined;
  store: TooltipStoreInstance;
}) {
  const value = useMemo(
    () => ({ isDisabled, getTooltipComponent, store }),
    [isDisabled, getTooltipComponent, store],
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}
