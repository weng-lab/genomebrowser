// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { Workspace } from "../components/workspace/Workspace";
import { WorkspacePage } from "../components/workspace/WorkspacePage";
import { setTestPathname } from "./workspaceFixture";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("retains preferences across page remounts and resets them with the workspace", () => {
  function Center() {
    return <p>Main content</p>;
  }
  function Right() {
    return <p>Tools</p>;
  }
  function Left() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount((value) => value + 1)}>Count {count}</button>;
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (pageId: string, key = "workspace") => {
    setTestPathname(`/${pageId}`);
    act(() =>
      root.render(
        <Workspace key={key} navigation={[]}>
          <WorkspacePage
            key={pageId}
            title={pageId}
            left={pageId === "c" ? undefined : { title: "Items", children: <Left /> }}
            right={pageId === "c" ? undefined : { title: "Tools", children: <Right /> }}
          >
            <Center />
          </WorkspacePage>
        </Workspace>,
      ),
    );
  };
  const handle = () =>
    container.querySelector<HTMLElement>('[role="separator"][aria-controls="left-panel"]')!;
  const counter = () => container.querySelector<HTMLButtonElement>("#left-panel button")!;
  try {
    render("a");
    act(() => counter().click());
    act(() => handle().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(handle().getAttribute("aria-valuenow")).toBe("480");
    expect(counter().textContent).toBe("Count 1");

    render("b");
    expect(handle().getAttribute("aria-valuenow")).toBe("480");
    expect(counter().textContent).toBe("Count 0");
    act(() =>
      container.querySelector<HTMLButtonElement>('button[aria-controls="left-panel"]')!.click(),
    );
    render("c");
    expect(container.querySelector("#left-panel button")).toBeNull();
    render("a");
    expect(handle().getAttribute("aria-valuenow")).toBe("480");
    expect(counter().textContent).toBe("Count 0");
    expect(container.querySelector("#left-panel")?.hasAttribute("inert")).toBe(true);
    act(() =>
      container.querySelector<HTMLButtonElement>('button[aria-controls="left-panel"]')!.click(),
    );
    expect(getComputedStyle(container.querySelector("#left-panel")!).width).toBe("480px");
    render("a", "fresh-workspace");
    expect(handle().getAttribute("aria-valuenow")).toBe("240");
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
