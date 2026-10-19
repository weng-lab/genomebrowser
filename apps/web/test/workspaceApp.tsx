import { useSyncExternalStore, type ReactNode } from "react";
import { vi } from "vitest";
import { AccountControls, type Account } from "../app/(workspace)/AccountControls";
import { AppProviders } from "../app/(workspace)/AppProviders";
import { BrowserPage } from "../app/(workspace)/browser/BrowserPage";
import BrowserIndexPage from "../app/(workspace)/browser/page";
import CollectionsPage from "../app/(workspace)/collections/page";
import { navigation } from "../app/(workspace)/navigation";
import SettingsPage from "../app/(workspace)/settings/page";
import { Workspace } from "../components/workspace/Workspace";

const history = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let entries = ["/browser"];
  let index = 0;
  function go(next: string[], at: number) {
    entries = next;
    index = at;
    window.history.replaceState(null, "", entries[index]);
    listeners.forEach((listener) => listener());
  }
  return {
    pathname: () => entries[index],
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    reset: (pathname: string) => go([pathname], 0),
    push: (href: string) => go([...entries.slice(0, index + 1), href], index + 1),
    replace: (href: string) => go(entries.with(index, href), index),
    back: () => go(entries, index - 1),
  };
});

/** Browser history for the Next.js router mocks, mirrored into `window.location`. */
export const route = {
  pathname: () => history.pathname(),
  reset: (pathname: string) => history.reset(pathname),
  push: (href: string) => history.push(href),
  back: () => history.back(),
};

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const usePathname = () => useSyncExternalStore(history.subscribe, history.pathname);
  const router = { push: history.push, replace: history.replace, back: history.back };
  return {
    usePathname,
    useRouter: () => router,
    useParams: () => {
      const sessionId = /^\/browser\/([^/]+)$/.exec(usePathname())?.[1];
      return sessionId ? { sessionId } : {};
    },
    // Next interrupts rendering to redirect; here the page renders once more first.
    redirect: (href: string) => queueMicrotask(() => history.replace(href)),
  };
});
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        history.push(href);
      }}
    >
      {children}
    </a>
  ),
}));

function Page() {
  const pathname = useSyncExternalStore(history.subscribe, history.pathname);
  const sessionId = /^\/browser\/([^/]+)$/.exec(pathname)?.[1];
  // Like Next, another session ID renders a new page.
  if (sessionId) return <BrowserPage key={sessionId} sessionId={sessionId} />;
  if (pathname === "/browser") return <BrowserIndexPage />;
  if (pathname === "/settings") return <SettingsPage />;
  return <CollectionsPage />;
}

/**
 * The workspace layout's composition, for a mock user unless `account` says otherwise,
 * with the page for the current route. `children` render beside the workspace, inside
 * its providers.
 */
export function WorkspaceApp({
  account = {
    mode: "mock",
    userId: "user_alice",
    users: ["user_alice", "user_bob"],
    cookie: "gb_mock_user",
  },
  children,
}: {
  account?: Account;
  children?: ReactNode;
}) {
  return (
    <AppProviders account={account}>
      <Workspace navigation={navigation} footer={<AccountControls account={account} />}>
        <Page />
      </Workspace>
      {children}
    </AppProviders>
  );
}

/** Browser APIs jsdom lacks that the genome browser measures. */
export function stubLayout() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
}
