import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import type { TrackTooltipComponent } from "../../modules/types";
import { TooltipContextProvider } from "./TooltipContext";
import { createTooltipStore } from "./tooltipStore";

export function TooltipProvider({
  children,
  disabled,
  isDisabled,
  getTooltipComponent,
}: {
  children: ReactNode;
  disabled: boolean;
  isDisabled?: () => boolean;
  getTooltipComponent: (type: string) => TrackTooltipComponent<any, any> | undefined;
}) {
  const store = useMemo(() => createTooltipStore(), []);
  const getIsDisabled = useCallback(
    () => disabled || isDisabled?.() === true,
    [disabled, isDisabled],
  );

  useEffect(() => {
    if (disabled) store.getState().hide();
  }, [disabled, store]);

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
