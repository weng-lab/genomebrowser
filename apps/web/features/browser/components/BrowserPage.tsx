"use client";

import AutoAwesome from "@mui/icons-material/AutoAwesome";
import type { ReactNode } from "react";
import { usePanelState } from "../../../shared/workspace/panels/panelState";
import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { AgentPanel } from "../../agent/components/AgentPanel";
import { SaveStatus } from "../../sessions/components/SaveStatus";
import { SessionsPanel } from "../../sessions/components/SessionsPanel";
import { SessionSwitcher } from "../../sessions/components/SessionSwitcher";
import { browserPanels } from "../panels";
import { BrowserTools } from "./BrowserTools";

/**
 * The browser's frame around `children`, the browser route's page. The browser layout
 * renders it, so the session switcher and its menu stay open while the URL moves
 * between sessions, such as when the open session is deleted. The left panel shows either
 * the browser's tools, named for the side bar's Browser entry: the open session's card, then
 * saved regions; or every saved session, which the session menu's All sessions also shows.
 */
export function BrowserPage({ children }: { children: ReactNode }) {
  const showLeft = usePanelState((state) => state.showLeft);
  return (
    <WorkspacePage
      title="Browser"
      heading={<SessionSwitcher onAllSessions={() => showLeft(browserPanels.sessions)} />}
      actions={<SaveStatus />}
      left={[
        { id: browserPanels.tools, title: "Genome Browser", children: <BrowserTools /> },
        { id: browserPanels.sessions, title: "Sessions", children: <SessionsPanel /> },
      ]}
      right={{ title: "AI Assist", icon: <AutoAwesome />, children: <AgentPanel /> }}
    >
      {children}
    </WorkspacePage>
  );
}
