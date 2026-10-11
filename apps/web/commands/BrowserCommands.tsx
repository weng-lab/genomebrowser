"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useBrowserSession } from "../session/BrowserSession";
import { connectBrowserCommands, type CommandConnectionState } from "./connection";

const disabledConnection: CommandConnectionState = { status: "disabled" };
const CommandConnectionContext = createContext<CommandConnectionState>(disabledConnection);

export function BrowserCommands({
  endpoint,
  children,
}: {
  endpoint?: string;
  children: ReactNode;
}) {
  const session = useBrowserSession();
  const [connection, setConnection] = useState<CommandConnectionState>({ status: "connecting" });

  useEffect(() => {
    if (endpoint) return connectBrowserCommands(endpoint, session, setConnection);
  }, [endpoint, session]);

  return (
    <CommandConnectionContext value={endpoint ? connection : disabledConnection}>
      {children}
    </CommandConnectionContext>
  );
}

export function useCommandConnection() {
  return useContext(CommandConnectionContext);
}
