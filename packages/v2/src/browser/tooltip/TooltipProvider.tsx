import { useEffect, useMemo, type ReactNode } from "react";
import { TooltipContextProvider } from "./TooltipContext";
import { createTooltipStore } from "./tooltipStore";

export function TooltipProvider({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  const store = useMemo(() => createTooltipStore(), []);

  useEffect(() => {
    if (disabled) store.getState().hide();
  }, [disabled, store]);

  return (
    <TooltipContextProvider store={store} disabled={disabled}>
      {children}
    </TooltipContextProvider>
  );
}
