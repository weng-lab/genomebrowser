// @vitest-environment jsdom
import { act, useState, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { validateTrackCollection } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { sessionSnapshotSchema, type SessionSnapshot } from "@weng-lab/browser-server/protocol";
import { AppProviders } from "../app/(workspace)/AppProviders";
import { Workspace } from "../components/workspace/Workspace";
import { navigation } from "../app/(workspace)/navigation";
import {
  collectionSummaries,
  defaultCollectionId,
  getTrackCollection,
} from "../app/(workspace)/collections/catalog";
import { CollectionsWorkspace } from "../app/(workspace)/collections/CollectionsWorkspace";
import CollectionPage from "../app/(workspace)/collections/[collectionId]/page";
import { BrowserView } from "../app/(workspace)/browser/BrowserView";
import { useBrowserSession, type BrowserSession } from "../browser/BrowserSession";
import { useSessionId } from "../browser/BrowserServer";
import { snapshot } from "../browser/snapshot";

const route = vi.hoisted(() => ({ pathname: "/collections", navigate: (_href: string) => {} }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useParams: () =>
    route.pathname.startsWith("/browser/") ? { sessionId: route.pathname.split("/").at(-1) } : {},
  useRouter: () => ({ push: route.navigate }),
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        route.navigate(href);
      }}
    >
      {children}
    </a>
  ),
}));

let probe: Probe | undefined;
let session: BrowserSession;
let saved: Map<string, SessionSnapshot>;
let put: ReturnType<typeof vi.fn<typeof fetch>>;
let load: (url: string) => Promise<Response>;
function SessionObserver() {
  session = useBrowserSession();
  return <output data-testid="session">{useSessionId()}</output>;
}
function TestApp() {
  const [pathname, setPathname] = useState(`/collections/${defaultCollectionId}`);
  route.pathname = pathname;
  route.navigate = setPathname;
  const id = pathname.split("/").at(-1)!;
  return (
    <AppProviders>
      <SessionObserver />
      <Workspace navigation={navigation}>
        {pathname.startsWith("/collections") ? (
          <CollectionsWorkspace collection={getTrackCollection(id)!} />
        ) : (
          <BrowserView />
        )}
      </Workspace>
    </AppProviders>
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  saved = new Map();
  put = vi.fn(async (url, init) => {
    saved.set(String(url), sessionSnapshotSchema.parse(JSON.parse(init!.body as string)));
    return Response.json({ ok: true });
  });
  load = async (url) =>
    saved.has(url) ? Response.json(saved.get(url)) : Response.json({}, { status: 404 });
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "PUT"
      ? put(url, init)
      : init?.method === "POST"
        ? Promise.resolve(Response.json({ ok: true }))
        : load(url),
  );
  vi.stubGlobal(
    "EventSource",
    class extends EventTarget {
      onopen = null;
      onerror = null;
      close() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
});
afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function selectTrack(id: string) {
  const row = document.querySelector(`[data-id="${id}"]`);
  expect(row, `Track row ${id}`).not.toBeNull();
  const checkbox = row!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await probe!.measure(() => checkbox.click());
}
async function button(label: string) {
  const item = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (node) => node.textContent === label,
  )!;
  expect(item).toBeDefined();
  await probe!.measure(() => item.click());
}
async function openCollection(id: string) {
  await probe!.measure(() =>
    document
      .querySelector<HTMLAnchorElement>(
        `[aria-label="Track collections"] a[href="/collections/${id}"]`,
      )!
      .click(),
  );
}
async function advance() {
  await act(async () => vi.advanceTimersByTimeAsync(200));
}

it("lists and validates all six app-owned collections with grouped tracks in the center pane", async () => {
  expect(collectionSummaries).toHaveLength(6);
  for (const summary of collectionSummaries) {
    expect(
      validateTrackCollection(getTrackCollection(summary.id), firstPartyTrackModules).tracks,
    ).toHaveLength(summary.trackCount);
  }
  probe = await renderWithProbe(<TestApp />);
  expect(
    document.querySelector('[aria-label="Track collections"]')?.querySelectorAll("a"),
  ).toHaveLength(6);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await openCollection("cave-development");
  expect(document.querySelector("main h2")?.textContent).toBe("CAVE developmental methylation");
  expect(document.querySelector("main")?.textContent).toContain("Adulthood");
  await openCollection("human-biosamples");
  expect(document.querySelector("main")?.textContent).toContain("5,845 tracks");
  expect(document.querySelector('button[aria-label="Search"]')).not.toBeNull();
  expect(document.querySelector('main [role="treegrid"]')).not.toBeNull();
  expect(getTrackCollection("missing")).toBeUndefined();
}, 15000);

it("adds selections to the active session, preserves other collections, and restores saved tracks", async () => {
  probe = await renderWithProbe(<TestApp />);
  const referenceId = "reference-annotations::gencode-v29-basic";
  const original = session.useTrackStore.getState().tracks.map((track) => track.base.id);
  await selectTrack(referenceId);
  // Checkbox selection is a draft until Submit.
  expect(session.useTrackStore.getState().tracks.map((track) => track.base.id)).toEqual(original);
  await button("Submit");
  expect(route.pathname).toBe("/browser/local");
  expect(session.useTrackStore.getState().tracks.map((track) => track.base.id)).toEqual([
    ...original.filter((id) => id !== "genes"),
    "genes",
    referenceId,
  ]);
  await advance();
  expect(saved.get("/api/sessions/local")!.tracks.map((track) => track.base.id)).toContain(
    referenceId,
  );

  await probe!.measure(() => route.navigate("/collections/ccre-comparisons"));
  const ccreId = "ccre-comparisons::aggregate-and-adipose-ccres";
  await selectTrack(ccreId);
  await button("Submit");
  await advance();
  const ids = session.useTrackStore.getState().tracks.map((track) => track.base.id);
  expect(ids).toEqual([...original.filter((id) => id !== "genes"), "genes", referenceId, ccreId]);

  await probe!.measure(() => route.navigate("/browser/another"));
  expect(session.useTrackStore.getState().tracks.map((track) => track.base.id)).toEqual(original);
  await advance();
  await probe!.measure(() => route.navigate("/browser/local"));
  expect(session.useTrackStore.getState().tracks.map((track) => track.base.id)).toEqual(ids);
  expect(document.body.textContent).toContain("GENCODE 29 basic");
}, 15000);

it("opens the picker with existing selections and cancels a changed draft without changing tracks", async () => {
  probe = await renderWithProbe(<TestApp />);
  await selectTrack("reference-annotations::gencode-v29-basic");
  await button("Submit");
  await advance();
  const before = snapshot(session);
  await probe!.measure(() => route.navigate("/collections/reference-annotations"));
  expect(
    document.querySelector<HTMLInputElement>(
      '[data-id="reference-annotations::gencode-v29-basic"] input',
    )?.checked,
  ).toBe(true);
  await selectTrack("reference-annotations::gencode-v29-basic");
  await selectTrack("reference-annotations::gencode-v29-comprehensive");
  await button("Cancel");
  expect(route.pathname).toBe("/browser/local");
  expect(snapshot(session)).toEqual(before);
}, 15000);

it("waits for restoration before allowing a selection to overwrite the session", async () => {
  let resolve!: (response: Response) => void;
  load = () =>
    new Promise<Response>((done) => {
      resolve = done;
    });
  probe = await renderWithProbe(<TestApp />);
  expect(document.querySelector('[role="grid"]')).toBeNull();
  expect(document.body.textContent).toContain("Loading the browser session");
  expect(put).not.toHaveBeenCalled();
  const restored = snapshot(session);
  restored.browser.region = { chromosome: "chr1", start: 100, end: 200 };
  await probe!.measure(() => resolve(Response.json(restored)));
  expect(document.querySelector('[role="grid"]')).not.toBeNull();
  expect(session.useBrowserStore.getState().region).toEqual(restored.browser.region);
  expect(put).not.toHaveBeenCalled();
});

// A region edit does not change catalog data or the draft and must not render these app components.
it("isolates collection UI from browser-region changes", async () => {
  probe = await renderWithProbe(<TestApp />);
  const report = await probe!.measure(() =>
    session.useBrowserStore.getState().setRegion({
      chromosome: "chr1",
      start: 100,
      end: 200,
    }),
  );
  expect(report.pick("CollectionsView", "CollectionTrackPicker", "CollectionPanel"))
    .toMatchInlineSnapshot(`
    {
      "CollectionPanel": 0,
      "CollectionTrackPicker": 0,
      "CollectionsView": 0,
    }
  `);
});

it("uses Next not-found behavior for an unknown collection URL", async () => {
  await expect(
    CollectionPage({ params: Promise.resolve({ collectionId: "missing" }) }),
  ).rejects.toThrow("not-found");
});

it("marks default gene and aggregate cCRE tracks active without duplicating or rewriting them", async () => {
  probe = await renderWithProbe(<TestApp />);
  const original = snapshot(session);
  const geneId = "reference-annotations::gencode-v50-basic";
  const getGeneCheckbox = () =>
    document.querySelector<HTMLInputElement>(`[data-id="${geneId}"] input[type="checkbox"]`)!;
  expect(getGeneCheckbox().checked).toBe(true);
  expect(document.body.textContent).toContain("Active Tracks");
  expect(snapshot(session)).toEqual(original);
  await button("Submit");
  expect(
    session.useTrackStore
      .getState()
      .tracks.filter((track) => track.config.url === original.tracks[1].config.url),
  ).toEqual([
    expect.objectContaining({ base: original.tracks[1].base, config: original.tracks[1].config }),
  ]);
  await advance();

  await probe!.measure(() => route.navigate("/collections/human-biosamples"));
  // The shared Active Tracks tree has one selected root even when the large catalog grid is grouped.
  const tree = document.querySelector('[role="tree"]')!;
  expect(tree.textContent).toContain("Human Biosamples");
  await button("Submit");
  expect(
    session.useTrackStore
      .getState()
      .tracks.filter(
        (track) =>
          track.type === "ccre-bigbed" && track.config.url === original.tracks[2].config.url,
      ),
  ).toHaveLength(1);
  expect(
    session.useTrackStore.getState().tracks.find((track) => track.base.id === "ccres")!.config,
  ).toEqual(original.tracks[2].config);
  await advance();
  await probe!.measure(() => route.navigate("/browser/other"));
  await advance();
  await probe!.measure(() => route.navigate("/browser/local"));
  await probe!.measure(() => route.navigate("/collections/reference-annotations"));
  expect(getGeneCheckbox().checked).toBe(true);
  await selectTrack(geneId);
  await button("Submit");
  expect(session.useTrackStore.getState().tracks.some((track) => track.base.id === "genes")).toBe(
    false,
  );
  expect(session.useTrackStore.getState().tracks.some((track) => track.base.id === "ccres")).toBe(
    true,
  );
}, 15000);
