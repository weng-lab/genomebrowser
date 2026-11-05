import { useSyncExternalStore, type ReactNode } from "react";
import { beforeEach, vi } from "vitest";
import { AccountControls } from "../features/account/components/AccountControls";
import { AppProviders } from "../composition/AppProviders";
import { BrowserPage } from "../features/browser/components/BrowserPage";
import { BrowserView } from "../features/browser/components/BrowserView";
import BrowserIndexPage from "../app/(workspace)/browser/page";
import CollectionsPage from "../app/(workspace)/collections/page";
import { navigation } from "../composition/navigation";
import SettingsPage from "../app/(workspace)/settings/page";
import { Workspace } from "../shared/workspace/Workspace";

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

const fakeClerk = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let userId: string | null = "user_alice";
  /** Change the signed-in user, as Clerk does after a change in this or another tab. */
  function signIn(next: string | null) {
    userId = next;
    listeners.forEach((listener) => listener());
  }
  return {
    userId: () => userId,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    signIn,
    signOut: vi.fn<() => Promise<void>>(async () => signIn(null)),
    openUserProfile: vi.fn<() => void>(),
  };
});
/**
 * Clerk's React hooks for one tab, as Clerk reports them: tests sign a user in or
 * out, and the account menu's sign-out signs this tab out. Each test starts as
 * `user_alice`.
 */
export const clerk = fakeClerk;
vi.mock("@clerk/nextjs", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useAuth: () => {
      const userId = useSyncExternalStore(fakeClerk.subscribe, fakeClerk.userId);
      return { isLoaded: true, isSignedIn: userId !== null, userId };
    },
    useClerk: () => fakeClerk,
    UserAvatar: () => null,
  };
});
beforeEach(() => {
  clerk.signIn("user_alice");
  clerk.signOut.mockClear();
  clerk.openUserProfile.mockClear();
});

function Page() {
  const pathname = useSyncExternalStore(history.subscribe, history.pathname);
  const sessionId = /^\/browser\/([^/]+)$/.exec(pathname)?.[1];
  // Like Next, the browser layout persists across browser URLs, and another session ID
  // renders a new page inside it.
  if (sessionId)
    return (
      <BrowserPage>
        <BrowserView key={sessionId} sessionId={sessionId} />
      </BrowserPage>
    );
  if (pathname === "/browser")
    return (
      <BrowserPage>
        <BrowserIndexPage />
      </BrowserPage>
    );
  if (pathname === "/settings") return <SettingsPage />;
  return <CollectionsPage />;
}

/**
 * The workspace layout's composition for the `clerk` user, with the page for the
 * current route. `children` render beside the workspace, inside its providers.
 */
export function WorkspaceApp({ children }: { children?: ReactNode }) {
  return (
    <AppProviders>
      <Workspace navigation={navigation} footer={<AccountControls />}>
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
