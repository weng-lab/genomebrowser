// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SiteHeader } from "@/features/site/SiteHeader";
import { RegisterActiveSession, ActiveSessionProvider } from "@/features/sessions/activeSession";
import { DeleteSessionButton } from "@/features/sessions/components/DeleteSessionButton";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  user: { id: "owner-a" } as { id: string } | null,
  remove: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: mocks.user }) }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("next/link", () => ({
  default: ({ prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => (
    <a {...props} />
  ),
}));
vi.mock("@/features/auth/AccountControls", () => ({ AccountControls: () => null }));
vi.mock("@/features/sessions/actions", () => ({ deleteSession: mocks.remove }));
const first = { id: "session-one", name: "Enhancer study", ownerId: "owner-a" };
const second = { id: "session-two", name: "Promoter study", ownerId: "owner-a" };
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  mocks.pathname = "/";
  mocks.user = { id: "owner-a" };
  mocks.remove.mockReset().mockResolvedValue({ ok: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render(session?: typeof first | null, showDelete = false) {
  await act(async () =>
    root.render(
      <ActiveSessionProvider authConfigured>
        <SiteHeader authConfigured />
        {session !== undefined && <RegisterActiveSession session={session} />}
        {showDelete && <DeleteSessionButton id={first.id} name={first.name} />}
      </ActiveSessionProvider>,
    ),
  );
}
function browserLink() {
  return [...container.querySelectorAll<HTMLAnchorElement>("a")].find(
    (a) => a.textContent === "Browser",
  )!;
}

it("shows the loaded title, selects Browser for session routes, and returns to it from the dashboard", async () => {
  mocks.pathname = `/browser/${first.id}`;
  await render(first);
  expect(container.textContent).toContain(first.name);
  expect(browserLink().getAttribute("href")).toBe(`/browser/${first.id}`);
  expect(browserLink().getAttribute("aria-current")).toBe("page");
  mocks.pathname = "/dashboard";
  await render();
  expect(browserLink().getAttribute("href")).toBe(`/browser/${first.id}`);
  expect(browserLink().hasAttribute("aria-current")).toBe(false);
  expect(container.textContent).toContain(first.name);
});

it("remembers the selected session through a page reload and replaces it when opening another", async () => {
  await render(first);
  await act(async () => root.unmount());
  root = createRoot(container);
  mocks.pathname = "/dashboard";
  await render();
  expect(browserLink().getAttribute("href")).toBe(`/browser/${first.id}`);
  await render(second);
  expect(browserLink().getAttribute("href")).toBe(`/browser/${second.id}`);
  expect(container.textContent).toContain(second.name);
  expect(container.textContent).not.toContain(first.name);
});

it("prefers the loaded route over an older remembered session", async () => {
  sessionStorage.setItem("genomebrowser:active-session:owner-a", JSON.stringify(first));
  await render(second);
  expect(browserLink().getAttribute("href")).toBe(`/browser/${second.id}`);
});

it("returns to the guest browser when guest mode is explicitly opened", async () => {
  await render(first);
  mocks.pathname = "/browser";
  await render(null);
  expect(browserLink().getAttribute("href")).toBe("/browser");
  expect(container.textContent).not.toContain(first.name);
  expect(sessionStorage.getItem("genomebrowser:active-session:owner-a")).toBeNull();
});

it("does not display another account's selected session after sign-out or account switching", async () => {
  await render(first);
  mocks.user = null;
  await render();
  expect(container.textContent).not.toContain(first.name);
  expect(browserLink().getAttribute("href")).toBe("/browser");
  mocks.user = { id: "owner-b" };
  await render();
  expect(container.textContent).not.toContain(first.name);
  expect(browserLink().getAttribute("href")).toBe("/browser");
});

it("clears the navbar selection after deleting the selected session", async () => {
  await render(first);
  await render(undefined, true);
  const clickDelete = async () => {
    const buttons = [...document.querySelectorAll("button")].filter(
      (b) => b.textContent === "Delete",
    );
    await act(async () => buttons.at(-1)!.click());
  };
  await clickDelete();
  await clickDelete();
  expect(mocks.remove).toHaveBeenCalledWith(first.id);
  expect(browserLink().getAttribute("href")).toBe("/browser");
  expect(sessionStorage.getItem("genomebrowser:active-session:owner-a")).toBeNull();
});
