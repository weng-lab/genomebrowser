"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useBrowserSession } from "./BrowserSession";
import { connectBrowserCommands, type CommandConnectionState } from "./connection";

import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { SessionSaveState } from "./persistence";

const disabledSaveStore = createStore<{ status: SessionSaveState }>(() => ({ status: "disabled" }));
const SessionSaveContext = createContext(disabledSaveStore);

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

  const [saveStore] = useState(() =>
    createStore<{ status: SessionSaveState }>(() => ({ status: "loading" })),
  );

  useEffect(() => {
    if (endpoint)
      return connectBrowserCommands(endpoint, session, setConnection, (status) =>
        saveStore.setState({ status }),
      );
  }, [endpoint, session, saveStore]);

  return (
    <CommandConnectionContext value={endpoint ? connection : disabledConnection}>
      <SessionSaveContext value={endpoint ? saveStore : disabledSaveStore}>
        {children}
      </SessionSaveContext>
    </CommandConnectionContext>
  );
}

export function useCommandConnection() {
  return useContext(CommandConnectionContext);
}

export function useSessionSaveState() {
  return useStore(useContext(SessionSaveContext), (state) => state.status);
}

export function useSessionLoading() {
  return useStore(
    useContext(SessionSaveContext),
    (state) => state.status === "loading" || state.status === "load-error",
  );
}
