// @vitest-environment node

// Next.js renders client components on the server first, where `document` does not exist.
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SessionSwitcher } from "../features/sessions/components/SessionSwitcher";
import { SessionProvider } from "../features/sessions/SessionProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {}, replace() {} }),
  useParams: () => ({}),
}));

it("renders the session switcher on the server", () => {
  const html = renderToString(
    <SessionProvider>
      <SessionSwitcher />
    </SessionProvider>,
  );
  expect(html).toContain("No session open");
});
