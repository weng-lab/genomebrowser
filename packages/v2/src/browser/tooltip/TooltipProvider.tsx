import { useCallback, useMemo, type ReactNode } from "react";
import type { AnyTrackTooltipComponent } from "../../modules/types";
import { TooltipContextProvider } from "./TooltipContext";
import { createTooltipStore } from "./tooltipStore";

export function TooltipProvider({
  children,
  isDisabled,
  getTooltipComponent,
}: {
  children: ReactNode;
  isDisabled?: () => boolean;
  getTooltipComponent: (type: string) => AnyTrackTooltipComponent | undefined;
}) {
  const store = useMemo(() => createTooltipStore(), []);
  const getIsDisabled = useCallback(() => isDisabled?.() === true, [isDisabled]);

  return (
    <TooltipContextProvider
      store={store}
      isDisabled={getIsDisabled}
      getTooltipComponent={getTooltipComponent}
    >
      {children}
    </TooltipContextProvider>
  );
}
