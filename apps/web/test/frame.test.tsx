// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { setTestPathname } from "./workspaceFixture";
import { Workspace } from "../components/workspace/Workspace";
import { WorkspacePage } from "../components/workspace/WorkspacePage";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
});
function setup() {
  setTestPathname("/home");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <Workspace navigation={[{ href: "/home", label: "Home", icon: "H" }]}>
        <WorkspacePage
          title="Home"
          subtitle="Overview"
          left={{ title: "Projects", children: <p>Project list</p> }}
          right={{ title: "Assistant", children: <p>Assistant content</p> }}
        >
          <p>Home content</p>
        </WorkspacePage>
      </Workspace>,
    ),
  );
}
it("renders native navigation and page-owned title, content, and panels", () => {
  setup();
  expect(container.querySelector('nav a[aria-current="page"]')?.getAttribute("href")).toBe("/home");
  expect(container.querySelector("header h1")?.textContent).toBe("Overview");
  expect(container.querySelector("main")?.textContent).toBe("Home content");
  expect(container.querySelector("#left-panel h2")?.textContent).toBe("Projects");
  expect(container.querySelector("#right-panel h2")?.textContent).toBe("Assistant");
});
it("collapses independently and restores panels through accessible controls", () => {
  setup();
  const rightToggle = container.querySelector<HTMLButtonElement>(
    'button[aria-controls="right-panel"]',
  )!;
  expect(rightToggle.getAttribute("aria-expanded")).toBe("false");
  expect(container.querySelector("#right-panel")?.hasAttribute("inert")).toBe(true);
  act(() => rightToggle.click());
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="left-panel"]')!;
  act(() => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(container.querySelector("#left-panel")?.hasAttribute("inert")).toBe(true);
  expect(getComputedStyle(container.querySelector("#right-panel")!).width).toBe("360px");
  act(() => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
});
it("renders page-supplied content without side panels and a sidebar footer", () => {
  setup();
  act(() =>
    root!.render(
      <Workspace
        navigation={[
          { href: "/home", label: "Home", icon: "H" },
          { href: "/settings", label: "Settings", icon: "S", placement: "bottom" },
        ]}
        footer={<button>Account</button>}
      >
        <WorkspacePage title="Settings">
          <p>Settings content</p>
        </WorkspacePage>
      </Workspace>,
    ),
  );
  expect(container.querySelector("header h1")?.textContent).toBe("Settings");
  expect(container.querySelector('button[aria-controls="left-panel"]')).toBeNull();
  expect(container.querySelector("nav")?.lastElementChild?.textContent).toBe("Account");
  expect(
    container.querySelector("nav")?.lastElementChild?.previousElementSibling?.getAttribute("href"),
  ).toBe("/settings");
});

it("selects nested navigation routes only at a path boundary", () => {
  setup();
  const render = (pathname: string) => {
    setTestPathname(pathname);
    act(() =>
      root!.render(
        <Workspace navigation={[{ href: "/browser", label: "Browser", icon: "B" }]}>
          <WorkspacePage title="Browser">Content</WorkspacePage>
        </Workspace>,
      ),
    );
  };
  render("/browser/session");
  expect(container.querySelector("nav a")?.getAttribute("aria-current")).toBe("location");
  render("/browserish");
  expect(container.querySelector("nav a")?.hasAttribute("aria-current")).toBe(false);
  render("/browser");
  expect(container.querySelector("nav a")?.getAttribute("aria-current")).toBe("page");
});

it("toggles panels with keyboard shortcuts and ignores input fields", () => {
  setup();
  const key = (target: EventTarget, altKey = false) => {
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "b",
          code: "KeyB",
          ctrlKey: true,
          altKey,
          bubbles: true,
        }),
      );
      target.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "b",
          code: "KeyB",
          ctrlKey: true,
          altKey,
          bubbles: true,
        }),
      );
    });
  };
  key(document);
  expect(
    container.querySelector('button[aria-controls="left-panel"]')?.getAttribute("aria-expanded"),
  ).toBe("false");
  key(document, true);
  expect(
    container.querySelector('button[aria-controls="right-panel"]')?.getAttribute("aria-expanded"),
  ).toBe("true");
  const input = document.createElement("input");
  container.append(input);
  input.focus();
  key(input);
  key(input, true);
  expect(
    container.querySelector('button[aria-controls="left-panel"]')?.getAttribute("aria-expanded"),
  ).toBe("false");
  expect(
    container.querySelector('button[aria-controls="right-panel"]')?.getAttribute("aria-expanded"),
  ).toBe("true");
});
