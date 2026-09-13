// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ErrorState } from "../../src/browser/track-row/ErrorState";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("renders complete error text safely within the track without a dialog", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const message = 'Track "Peaks": <script>bad</script> ' + "long details ".repeat(100);
  try {
    await act(async () =>
      root.render(
        <svg>
          <ErrorState x={0} y={0} width={80} height={12} message={message} />
        </svg>,
      ),
    );
    const error = container.querySelector('[role="region"]')!;
    expect(error.textContent).toBe(`Error — ${message}`);
    expect(error.closest("foreignObject")).toBeTruthy();
    expect(error.getAttribute("tabindex")).toBe("0");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(document.body.querySelector("dialog")).toBeNull();
    await act(async () => root.render(<svg />));
    expect(document.body.querySelector("dialog")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
