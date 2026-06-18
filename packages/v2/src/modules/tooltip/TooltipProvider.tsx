import { useEffect, useMemo, type ReactNode } from "react";
import { useModuleRuntime } from "../runtime/ModuleRuntimeContext";
import { TooltipContextProvider } from "./TooltipContext";
import { createTooltipStore } from "./tooltipStore";

export function TooltipProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createTooltipStore(), []);
  const { isPanning } = useModuleRuntime();

  useEffect(() => {
    if (isPanning) store.getState().hide();
  }, [isPanning, store]);

  return <TooltipContextProvider store={store}>{children}</TooltipContextProvider>;
}
