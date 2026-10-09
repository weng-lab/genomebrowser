// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { Workspace, type WorkspacePages } from "../src";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Stand-in pages covering each panel combination: all panels, center and right, center only.
const testPages: WorkspacePages = [
  {
    id: "home",
    label: "Home",
    icon: <span>H</span>,
    panels: {
      left: { title: "Projects", content: () => <p>Project list</p> },
      center: { title: () => "Overview", content: () => <p>Home content</p> },
      right: { title: "Assistant", content: () => <p>Assistant content</p> },
    },
  },
  {
    id: "reports",
    label: "Reports",
    icon: <span>R</span>,
    panels: {
      center: { content: () => <p>Reports content</p> },
      right: { title: "Assistant", content: () => <p>Assistant content</p> },
    },
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: <span>P</span>,
    placement: "bottom",
    panels: { center: { content: () => <p>Preferences content</p> } },
  },
];

// Routes like a minimal router: the page ID is the path after the leading slash.
function TestShell({ pages = testPages }: { pages?: WorkspacePages }) {
  const [pageId, setPageId] = useState<string>();
  return <Workspace pages={pages} pageId={pageId} navigate={(href) => setPageId(href.slice(1))} />;
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function panelShortcut(altKey = false, target: EventTarget = document) {
  const event = new KeyboardEvent("keydown", {
    key: "b",
    code: "KeyB",
    ctrlKey: true,
    altKey,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
    target.dispatchEvent(
      new KeyboardEvent("keyup", { key: "b", code: "KeyB", ctrlKey: true, altKey, bubbles: true }),
    );
    target.dispatchEvent(new KeyboardEvent("keyup", { key: "Control", bubbles: true }));
  });
  return event;
}

it("toggles each side panel with its keyboard shortcut independently", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));
  const expanded = (side: string) =>
    container!
      .querySelector(`button[aria-controls="${side}-panel"]`)
      ?.getAttribute("aria-expanded");

  expect(panelShortcut().defaultPrevented).toBe(true);
  expect(expanded("left")).toBe("false");
  expect(expanded("right")).toBe("true");
  expect(panelShortcut().defaultPrevented).toBe(true);
  expect(expanded("left")).toBe("true");

  expect(panelShortcut(true).defaultPrevented).toBe(true);
  expect(expanded("right")).toBe("false");
  expect(expanded("left")).toBe("true");
  expect(panelShortcut(true).defaultPrevented).toBe(true);
  expect(expanded("right")).toBe("true");
  expect(expanded("left")).toBe("true");
});

it("leaves shortcuts for absent panels unhandled and preserves their visibility", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));
  const go = (label: string) =>
    act(() => container!.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!.click());
  const expanded = (side: string) =>
    container!
      .querySelector(`button[aria-controls="${side}-panel"]`)
      ?.getAttribute("aria-expanded");

  panelShortcut(true);
  go("Reports");
  expect(panelShortcut().defaultPrevented).toBe(false);
  go("Home");
  expect(expanded("left")).toBe("true");
  expect(expanded("right")).toBe("false");

  go("Preferences");
  expect(panelShortcut().defaultPrevented).toBe(false);
  expect(panelShortcut(true).defaultPrevented).toBe(false);
  go("Home");
  expect(expanded("left")).toBe("true");
  expect(expanded("right")).toBe("false");
});

it("ignores panel shortcuts while typing in an input", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const pages: WorkspacePages = [
    { ...testPages[0]!, panels: { ...testPages[0]!.panels, center: { content: () => <input /> } } },
  ];
  act(() => root?.render(<TestShell pages={pages} />));
  const input = container.querySelector("input")!;
  input.focus();

  expect(panelShortcut(false, input).defaultPrevented).toBe(false);
  expect(panelShortcut(true, input).defaultPrevented).toBe(false);
  expect(container.querySelector("#left-panel")?.hasAttribute("inert")).toBe(false);
  expect(container.querySelector("#right-panel")?.hasAttribute("inert")).toBe(false);
});

it("toggles only once while a shortcut is held and removes bindings on unmount", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));
  const keydown = (repeat: boolean) =>
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "b",
          code: "KeyB",
          ctrlKey: true,
          repeat,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  keydown(false);
  keydown(true);
  expect(
    container.querySelector('button[aria-controls="left-panel"]')?.getAttribute("aria-expanded"),
  ).toBe("false");
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "b", code: "KeyB", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Control", bubbles: true }));
  });
  panelShortcut();
  expect(
    container.querySelector('button[aria-controls="left-panel"]')?.getAttribute("aria-expanded"),
  ).toBe("true");

  act(() => root?.unmount());
  root = undefined;
  expect(panelShortcut().defaultPrevented).toBe(false);
  expect(panelShortcut(true).defaultPrevented).toBe(false);
});

it("renders the current page's panels in the frame", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => root?.render(<TestShell />));

  expect(container.querySelector('nav [aria-current="page"]')?.getAttribute("aria-label")).toBe(
    "Home",
  );
  expect(container.querySelector("header")?.textContent).toBe("Home/Overview");
  expect(container.querySelector("#left-panel h2")?.textContent).toBe("Projects");
  expect(container.querySelector("main")?.textContent).toBe("Home content");
  expect(container.querySelector("#right-panel h2")?.textContent).toBe("Assistant");
});

it("collapses and reopens the side panels", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));

  const leftPanel = container.querySelector<HTMLElement>("#left-panel")!;
  const rightPanel = container.querySelector<HTMLElement>("#right-panel")!;
  const leftToggle = container.querySelector<HTMLButtonElement>(
    'button[aria-controls="left-panel"]',
  )!;
  const rightToggle = container.querySelector<HTMLButtonElement>(
    'button[aria-controls="right-panel"]',
  )!;

  act(() => leftToggle.click());
  expect(getComputedStyle(leftPanel).width).toBe("0px");
  expect(leftPanel.hasAttribute("inert")).toBe(true);
  expect(leftToggle.getAttribute("aria-expanded")).toBe("false");
  expect(leftToggle.getAttribute("aria-label")).toBe("Show left panel");
  expect(getComputedStyle(rightPanel).width).toBe("360px");
  expect(rightPanel.hasAttribute("inert")).toBe(false);

  act(() => rightToggle.click());
  expect(getComputedStyle(rightPanel).width).toBe("0px");

  act(() => leftToggle.click());
  expect(getComputedStyle(leftPanel).width).toBe("240px");
  expect(leftPanel.hasAttribute("inert")).toBe(false);
  expect(leftToggle.getAttribute("aria-expanded")).toBe("true");
});

it("resizes a side panel by dragging or with the keyboard on its interior edge", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));

  const leftPanel = container.querySelector<HTMLElement>("#left-panel")!;
  const rightPanel = container.querySelector<HTMLElement>("#right-panel")!;
  const leftHandle = container.querySelector<HTMLElement>(
    '[role="separator"][aria-controls="left-panel"]',
  )!;
  const rightHandle = container.querySelector<HTMLElement>(
    '[role="separator"][aria-controls="right-panel"]',
  )!;
  // jsdom does not implement pointer capture.
  Object.assign(HTMLElement.prototype, {
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => true,
  });

  const pointer = (target: HTMLElement, type: string, clientX: number) =>
    act(() => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, button: 0 }));
    });

  // Dragging toward the center widens either panel.
  pointer(leftHandle, "pointerdown", 240);
  pointer(leftHandle, "pointerup", 300);
  expect(getComputedStyle(leftPanel).width).toBe("300px");
  expect(leftHandle.getAttribute("aria-valuenow")).toBe("300");

  pointer(rightHandle, "pointerdown", 1000);
  pointer(rightHandle, "pointerup", 900);
  expect(getComputedStyle(rightPanel).width).toBe("460px");

  // Widths stop at the panel's limits.
  pointer(leftHandle, "pointerdown", 300);
  pointer(leftHandle, "pointerup", 2000);
  expect(leftHandle.getAttribute("aria-valuenow")).toBe("480");

  act(() =>
    leftHandle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })),
  );
  expect(leftHandle.getAttribute("aria-valuenow")).toBe("464");
  act(() => leftHandle.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })));
  expect(leftHandle.getAttribute("aria-valuenow")).toBe("180");

  act(() => leftHandle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
  expect(getComputedStyle(leftPanel).width).toBe("240px");
});

it("switches pages from the side bar and keeps the frame's panel state", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));

  const pageButton = (label: string) =>
    container!.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!;
  const leftHandle = () =>
    container!.querySelector<HTMLElement>('[role="separator"][aria-controls="left-panel"]');

  act(() =>
    leftHandle()!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })),
  );

  act(() => pageButton("Preferences").click());
  expect(pageButton("Preferences").getAttribute("aria-current")).toBe("page");
  expect(pageButton("Home").hasAttribute("aria-current")).toBe(false);
  expect(container.querySelector("header h1")?.textContent).toBe("Preferences");
  expect(container.querySelector("main")?.textContent).toBe("Preferences content");
  // Preferences has neither side panel: both close and neither toggle renders.
  expect(container.querySelector("#left-panel")?.hasAttribute("inert")).toBe(true);
  expect(container.querySelector("#right-panel")?.hasAttribute("inert")).toBe(true);
  expect(container.querySelector("#right-panel h2")).toBeNull();
  expect(container.querySelector('button[aria-controls="left-panel"]')).toBeNull();
  expect(container.querySelector('button[aria-controls="right-panel"]')).toBeNull();

  // Reports has only a right panel.
  act(() => pageButton("Reports").click());
  expect(container.querySelector("#left-panel")?.hasAttribute("inert")).toBe(true);
  expect(container.querySelector("#right-panel")?.hasAttribute("inert")).toBe(false);
  expect(container.querySelector("#right-panel h2")).not.toBeNull();
  expect(container.querySelector('button[aria-controls="left-panel"]')).toBeNull();
  expect(container.querySelector('button[aria-controls="right-panel"]')).not.toBeNull();

  act(() => pageButton("Home").click());
  expect(container.querySelector("header h1")?.textContent).toBe("Overview");
  expect(leftHandle()?.getAttribute("aria-valuenow")).toBe("480");
});

it("shows the page named by pageId and falls back to the first page", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (pageId: string | undefined) =>
    act(() => root?.render(<Workspace pages={testPages} pageId={pageId} />));

  render("reports");
  expect(container.querySelector("header h1")?.textContent).toBe("Reports");
  expect(container.querySelector('nav a[aria-current="page"]')?.getAttribute("aria-label")).toBe(
    "Reports",
  );

  render("missing");
  expect(container.querySelector("header h1")?.textContent).toBe("Overview");
  render(undefined);
  expect(container.querySelector("header h1")?.textContent).toBe("Overview");
});

it("renders side bar pages as links that hand plain clicks to the router", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const navigate = vi.fn<(href: string) => void>();
  const prefetch = vi.fn<(href: string) => void>();
  act(() =>
    root?.render(
      <Workspace
        pages={testPages}
        pageId="home"
        getPageHref={(id) => `/app/${id}`}
        navigate={navigate}
        prefetch={prefetch}
      />,
    ),
  );
  const link = (label: string) =>
    container!.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!;
  // dispatchEvent returns false when the workspace prevented the browser's navigation.
  const click = (label: string, init: MouseEventInit = {}) => {
    let handledByBrowser = true;
    act(() => {
      handledByBrowser = link(label).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }),
      );
    });
    return handledByBrowser;
  };

  expect(link("Reports").getAttribute("href")).toBe("/app/reports");

  expect(click("Reports")).toBe(false);
  expect(navigate).toHaveBeenCalledWith("/app/reports");

  // Modified clicks open new tabs or windows, so the browser handles them.
  navigate.mockClear();
  expect(click("Reports", { metaKey: true })).toBe(true);
  expect(click("Reports", { ctrlKey: true })).toBe(true);
  expect(click("Reports", { shiftKey: true })).toBe(true);
  expect(navigate).not.toHaveBeenCalled();

  // The current page's link does nothing.
  expect(click("Home")).toBe(false);
  expect(navigate).not.toHaveBeenCalled();

  act(() => {
    link("Preferences").dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  expect(prefetch).toHaveBeenCalledWith("/app/preferences");
});

it("leaves link clicks to the browser without a navigate callback", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<Workspace pages={testPages} pageId="home" />));

  const reports = container.querySelector<HTMLAnchorElement>('nav a[aria-label="Reports"]')!;
  expect(reports.getAttribute("href")).toBe("/reports");
  // jsdom does not navigate, so stop the default after checking nothing prevented it.
  let prevented = true;
  reports.addEventListener("click", (event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  });
  act(() => reports.click());
  expect(prevented).toBe(false);
});

it("renders the side bar footer below the bottom-group pages", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <Workspace pages={testPages} pageId="home" sideBarFooter={<button>Account</button>} />,
    ),
  );

  const nav = container.querySelector("nav")!;
  expect(nav.lastElementChild?.textContent).toBe("Account");
  expect(nav.lastElementChild?.previousElementSibling?.getAttribute("aria-label")).toBe(
    "Preferences",
  );
});

it("renders pages a shell injects, with only the panels each page supplies", () => {
  const pages: WorkspacePages = [
    {
      id: "files",
      label: "Files",
      icon: <span>F</span>,
      panels: {
        left: { title: "Folders", content: () => <p>Folder list</p> },
        center: { title: () => "data/", content: () => <p>File grid</p> },
      },
    },
  ];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell pages={pages} />));

  expect(container.querySelector('nav a[aria-label="Files"]')).not.toBeNull();
  expect(container.querySelector("header h1")?.textContent).toBe("data/");
  expect(container.querySelector("main")?.textContent).toBe("File grid");
  expect(container.querySelector("#left-panel h2")?.textContent).toBe("Folders");
  expect(container.querySelector("#left-panel")?.textContent).toContain("Folder list");
  // No right panel: it stays closed and has no toggle.
  expect(container.querySelector("#right-panel")?.hasAttribute("inert")).toBe(true);
  expect(container.querySelector('button[aria-controls="left-panel"]')).not.toBeNull();
  expect(container.querySelector('button[aria-controls="right-panel"]')).toBeNull();
});

it("swaps side panels instantly on page changes and animates only toggles", () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell />));
  const leftPanel = container.querySelector<HTMLElement>("#left-panel")!;
  const transition = () => getComputedStyle(leftPanel).transition;

  // Reports has no left panel: it closes with no transition.
  act(() => container!.querySelector<HTMLAnchorElement>('nav a[aria-label="Reports"]')!.click());
  expect(getComputedStyle(leftPanel).width).toBe("0px");
  expect(transition()).toBe("none");

  act(() => container!.querySelector<HTMLAnchorElement>('nav a[aria-label="Home"]')!.click());
  expect(getComputedStyle(leftPanel).width).toBe("240px");
  expect(transition()).toBe("none");

  // The toggle animates until the width transition ends.
  act(() =>
    container!.querySelector<HTMLButtonElement>('button[aria-controls="left-panel"]')!.click(),
  );
  expect(transition()).toContain("width");
  act(() => {
    const event = new Event("transitionend", { bubbles: true });
    Object.assign(event, { propertyName: "width" });
    leftPanel.dispatchEvent(event);
  });
  expect(transition()).toBe("none");
});

it("keeps a shared side panel's state across pages that supply it", () => {
  function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>;
  }
  const assistant = { title: "Assistant", content: Counter };
  const pages: WorkspacePages = [
    {
      id: "a",
      label: "A",
      icon: <span>A</span>,
      panels: { center: { content: () => null }, right: assistant },
    },
    {
      id: "b",
      label: "B",
      icon: <span>B</span>,
      panels: { center: { content: () => null }, right: assistant },
    },
    { id: "c", label: "C", icon: <span>C</span>, panels: { center: { content: () => null } } },
  ];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<TestShell pages={pages} />));
  const counter = () => container!.querySelector<HTMLButtonElement>("#right-panel button");
  const go = (label: string) =>
    act(() => container!.querySelector<HTMLAnchorElement>(`nav a[aria-label="${label}"]`)!.click());

  act(() => counter()!.click());
  go("B");
  expect(counter()?.textContent).toBe("Count 1");

  // A page without the panel unmounts its content.
  go("C");
  go("A");
  expect(counter()?.textContent).toBe("Count 0");
});
