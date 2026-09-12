// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ErrorState } from "../../src/browser/track-row/ErrorState";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it("opens complete error text outside the clipped SVG and removes the dialog on recovery", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const showModal = vi.fn();
  const message = 'Track "Peaks": <script>bad</script> ' + "long details ".repeat(100);
  try {
    await act(async () =>
      root.render(
        <svg>
          <ErrorState x={0} y={0} width={80} height={12} message={message} />
        </svg>,
      ),
    );
    const button = container.querySelector("button")!;
    const dialog = document.body.querySelector("dialog")!;
    dialog.showModal = showModal;
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.querySelector("p")?.textContent).toBe(message);
    expect(dialog.querySelector("script")).toBeNull();
    expect(button.getAttribute("aria-label")).toBe(`Show error details: ${message}`);
    expect(dialog.getAttribute("aria-labelledby")).toBe(dialog.querySelector("h2")?.id);
    await act(async () => button.click());
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog.querySelector("form")?.getAttribute("method")).toBe("dialog");
    await act(async () => root.render(<svg />));
    expect(document.body.querySelector("dialog")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
