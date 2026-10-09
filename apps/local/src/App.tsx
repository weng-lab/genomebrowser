import { Workspace } from "@weng-lab/workspace";
import { useSyncExternalStore } from "react";
import { pages } from "./pages";

// A minimal history router: each page's path is its ID, such as /browser or /settings.

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function readPageId() {
  return window.location.pathname.split("/")[1];
}

function navigate(href: string) {
  window.history.pushState(null, "", href);
  // pushState does not fire popstate, so notify subscribers directly.
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const pageId = useSyncExternalStore(subscribe, readPageId);
  return <Workspace pages={pages} pageId={pageId} navigate={navigate} />;
}
