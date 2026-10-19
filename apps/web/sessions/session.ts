import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { Cause, Effect, Exit, Result, Schedule, Scope, Semaphore, type Fiber } from "effect";
import { createStore } from "zustand/vanilla";
import { restore, snapshot } from "../browser/snapshot";
import { startAutosave, type Autosave, type SaveStatus } from "./autosave";
import { sessionInputSchema, type Session } from "./schema";
import type { SessionRequestError, SessionTransport } from "./transport";

export type SessionState = {
  /** Whether saved sessions can be used. `unavailable` while listing them fails and retries. */
  status: "loading" | "ready" | "unavailable" | "signed-out";
  /** The account's saved sessions, sorted by name. */
  sessions: readonly Session[];
  /** The restored session shown in the browser. Only open, create, and remove replace it. */
  active: { id: string; name: string; stores: GenomeBrowserStores } | undefined;
  /** Saving of the active session's edits. */
  saveStatus: SaveStatus | undefined;
  /** The open, create, remove, or close operation in progress. They run one at a time. */
  pending: { operation: "open" | "create" | "remove" | "close"; id?: string } | undefined;
  /** Why the latest operation or save failed, for display. */
  error: string | undefined;
  /**
   * Restore a saved session after saving every edit to the active one. If either
   * step fails, the active session stays open with its edits. A newer request
   * to open a session supersedes an older one.
   */
  open(id: string): Promise<void>;
  /** Create a session for a supported assembly, then open it like `open`. */
  create(input: { name: string; assembly: string }): Promise<void>;
  /** Rename the active session. The name saves with its next autosave. */
  rename(name: string): void;
  /** Delete a session. For the active session, an outstanding write finishes first. */
  remove(id: string): Promise<void>;
  /**
   * Close the active session after saving every edit, or without saving when
   * `discard` is set, then run `next`, such as signing out. Nothing opens until
   * `next` settles. Resolves `false`, without running `next`, when the edits
   * could not be saved; the session then stays open with them.
   */
  close(options?: { discard?: boolean; next?: () => void | Promise<void> }): Promise<boolean>;
};

type Active = NonNullable<SessionState["active"]>;
type Pending = NonNullable<SessionState["pending"]>;
type Current = { id: string; scope: Scope.Closeable; autosave: Autosave };

const idle = {
  status: "loading",
  sessions: [],
  active: undefined,
  saveStatus: undefined,
  pending: undefined,
  error: undefined,
} satisfies Partial<SessionState>;

const unavailable = (error: SessionRequestError) => error.code === "UNAVAILABLE";
const byName = (a: Session, b: Session) =>
  a.name.localeCompare(b.name) || a.createdAt.getTime() - b.createdAt.getTime();

/**
 * The saved sessions of one account and the session open in the workspace.
 * Operations report failures in `error` rather than rejecting. Nothing runs
 * until `start`, which lists sessions and returns a function that stops all
 * requests and saving and clears the state.
 */
export function createSession({
  transport,
  createStores,
  navigation,
}: {
  transport: SessionTransport;
  /** Fresh stores at an assembly's defaults, or undefined when it is not supported. */
  createStores: (assembly: string) => GenomeBrowserStores | undefined;
  /** Show the active session, or none, once an operation settles. */
  navigation: { show(id: string | undefined): void };
}) {
  let scope: Scope.Closeable | undefined;
  let current: Current | undefined;
  let opening: { pending: Pending; done: Promise<void>; fiber: Fiber.Fiber<void> } | undefined;
  let listing: Fiber.Fiber<void> | undefined;
  // The shown error, while it is about edits the active session has not saved.
  let saveError: string | undefined;
  const lock = Semaphore.makeUnsafe(1);
  const store = createStore<SessionState>()(() => ({
    ...idle,
    open,
    create,
    rename,
    remove,
    close,
  }));
  const { getState: get, setState: set } = store;

  function run(effect: Effect.Effect<void>) {
    if (!scope) return undefined;
    const fiber = Effect.runSync(Effect.forkIn(effect, scope));
    const done = new Promise<void>((resolve) =>
      fiber.addObserver((exit) => {
        if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause))
          console.error(Cause.pretty(exit.cause));
        resolve();
      }),
    );
    return { fiber, done };
  }

  function failed(error: SessionRequestError, message: string) {
    if (error.code === "UNAUTHENTICATED")
      set({ status: "signed-out", error: "Sign in to use saved sessions." });
    else set({ error: message });
  }

  function list() {
    listing?.interruptUnsafe();
    listing = run(
      transport.list().pipe(
        Effect.tapError((error) =>
          Effect.sync(() => unavailable(error) && set({ status: "unavailable" })),
        ),
        Effect.retry({ while: unavailable, schedule: Schedule.spaced("5 seconds") }),
        Effect.match({
          onSuccess: (sessions) => {
            set({ status: "ready" });
            showList(sessions);
          },
          onFailure: (error) => failed(error, "Could not list saved sessions."),
        }),
      ),
    )?.fiber;
  }

  /** Show saved sessions with the active one's name, which may not be saved yet. */
  function showList(sessions: readonly Session[]) {
    const active = get().active;
    set({
      sessions: sessions
        .map((session) =>
          session.id === active?.id && session.name !== active.name
            ? { ...session, name: active.name }
            : session,
        )
        .sort(byName),
    });
  }

  /** Change the list locally. A read in progress may predate the change, so read again. */
  function changeList(change: (sessions: readonly Session[]) => Session[]) {
    showList(change(get().sessions));
    if (listing && !listing.pollUnsafe()) list();
  }

  /** Add or update a session the server just returned. */
  function remember(saved: Session) {
    changeList((sessions) => [...sessions.filter((session) => session.id !== saved.id), saved]);
  }

  function exclusive(pending: Pending, operation: Effect.Effect<void>) {
    return lock.withPermits(1)(
      Effect.suspend(() => {
        set({ pending, error: undefined });
        return operation;
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => get().pending === pending && set({ pending: undefined })),
        ),
      ),
    );
  }

  /** After a failed operation, show the session that is still open. */
  function stay() {
    if (current) navigation.show(current.id);
  }

  /**
   * Save every edit to `previous`, then end its saving with `finish`. Nothing
   * yields between the final check and `finish`, so no edit can fall between.
   * Fails, leaving it saving, when an edit cannot be saved.
   */
  const finishSaving = (previous: Current, finish: () => void) =>
    Effect.gen(function* () {
      while (true) {
        yield* previous.autosave.flush;
        // Hold writes from the final check until the stores stop saving.
        const finished = yield* Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* () {
            yield* restore(previous.autosave.pause);
            if (previous.autosave.dirty()) {
              yield* previous.autosave.resume;
              return false;
            }
            finish();
            yield* Scope.close(previous.scope, Exit.void);
            return true;
          }),
        );
        if (finished) return;
      }
    });

  /** Keep the open session open after its edits could not be saved. */
  function unsaved(error: SessionRequestError) {
    saveError = `Could not save “${get().active?.name}”. Its changes are kept here.`;
    failed(error, saveError);
    stay();
  }

  /** Replace the active session once the previous one has no unsaved edits. */
  const activate = (next: Active) =>
    Effect.gen(function* () {
      const sessionScope = yield* Scope.fork(scope!);
      const autosave = yield* startAutosave({
        id: next.id,
        stores: next.stores,
        transport,
        name: () => (get().active?.id === next.id ? get().active!.name : next.name),
        onStatus(saveStatus, failure) {
          if (current?.id !== next.id) return;
          set({ saveStatus });
          // Once every edit is saved, a failure to save them no longer applies.
          if (saveStatus === "saved" && saveError && get().error === saveError)
            set({ error: undefined });
          if (saveStatus !== "failed" || !failure) return;
          if (failure.code === "NOT_FOUND")
            saveError = "This session was deleted elsewhere. Its changes cannot be saved.";
          else if (failure.code === "INVALID_INPUT")
            saveError =
              "The latest changes are too large or invalid to save. Change them to keep saving.";
          else saveError = "Changes to this session can no longer be saved.";
          failed(failure, saveError);
        },
        onSaved(saved) {
          if (current?.id === next.id) remember(saved);
        },
      }).pipe(Scope.provide(sessionScope));
      let replaced = false;
      const replace = () => {
        replaced = true;
        current = { id: next.id, scope: sessionScope, autosave };
        set({ active: next, saveStatus: "saved" });
        navigation.show(next.id);
      };
      const previous = current;
      if (!previous) return replace();
      yield* finishSaving(previous, replace).pipe(
        Effect.catch((error) => Effect.sync(() => unsaved(error))),
        Effect.ensuring(
          Effect.suspend(() => (replaced ? Effect.void : Scope.close(sessionScope, Exit.void))),
        ),
      );
    });

  function open(id: string): Promise<void> {
    if (opening?.pending.id === id) return opening.done;
    if (!opening && get().active?.id === id) return Promise.resolve();
    // The newest request wins. Saving the active session continues regardless.
    opening?.fiber.interruptUnsafe();
    const pending: Pending = { operation: "open", id };
    const operation = Effect.gen(function* () {
      if (current?.id === id) return navigation.show(id);
      const loaded = yield* Effect.result(
        transport.load(id).pipe(
          Effect.retry({
            while: unavailable,
            schedule: Schedule.exponential("500 millis"),
            times: 2,
          }),
        ),
      );
      if (Result.isFailure(loaded)) {
        failed(
          loaded.failure,
          loaded.failure.code === "NOT_FOUND"
            ? "This session was not found. It may have been deleted."
            : "Could not open the session. Try again.",
        );
        return stay();
      }
      const { snapshot: saved, ...session } = loaded.success;
      remember(session);
      const stores = createStores(saved.browser.assembly);
      try {
        if (!stores) throw new Error(`Unsupported assembly ${saved.browser.assembly}`);
        restore(stores, saved);
      } catch {
        set({ error: "This session's saved state cannot be restored." });
        return stay();
      }
      yield* activate({ id, name: session.name, stores });
    });
    const task = run(
      exclusive(pending, operation).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            if (opening?.pending === pending) opening = undefined;
          }),
        ),
      ),
    );
    if (!task) return Promise.resolve();
    opening = { pending, ...task };
    return task.done;
  }

  function create({ name, assembly }: { name: string; assembly: string }): Promise<void> {
    const operation = Effect.gen(function* () {
      const stores = createStores(assembly);
      if (!stores) return set({ error: `The ${assembly} assembly is not supported.` });
      const created = yield* Effect.result(transport.create({ name, snapshot: snapshot(stores) }));
      if (Result.isFailure(created)) {
        return failed(
          created.failure,
          created.failure.code === "INVALID_INPUT"
            ? "Session names need 1 to 200 characters."
            : "Could not create the session. Try again.",
        );
      }
      remember(created.success);
      yield* activate({ id: created.success.id, name: created.success.name, stores });
    });
    return run(exclusive({ operation: "create" }, operation))?.done ?? Promise.resolve();
  }

  function rename(name: string): void {
    const active = get().active;
    if (!active || !current) return;
    const parsed = sessionInputSchema.shape.name.safeParse(name);
    if (!parsed.success) return set({ error: "Session names need 1 to 200 characters." });
    set({ active: { ...active, name: parsed.data }, error: undefined });
    changeList((sessions) =>
      sessions.map((session) =>
        session.id === active.id ? { ...session, name: parsed.data } : session,
      ),
    );
    current.autosave.renamed();
  }

  function remove(id: string): Promise<void> {
    const name = get().sessions.find((session) => session.id === id)?.name ?? "the session";
    const operation = Effect.gen(function* () {
      const target = current?.id === id ? current : undefined;
      // A write the server already accepted finishes first, so no write follows the deletion.
      if (target) yield* target.autosave.pause;
      const removed = yield* Effect.result(transport.remove(id));
      if (Result.isFailure(removed) && removed.failure.code !== "NOT_FOUND") {
        if (target) yield* target.autosave.resume;
        return failed(removed.failure, `Could not delete “${name}”. Try again.`);
      }
      changeList((sessions) => sessions.filter((session) => session.id !== id));
      if (!target) return;
      current = undefined;
      set({ active: undefined, saveStatus: undefined });
      navigation.show(undefined);
      yield* Scope.close(target.scope, Exit.void);
    });
    return run(exclusive({ operation: "remove", id }, operation))?.done ?? Promise.resolve();
  }

  function close({
    discard = false,
    next,
  }: { discard?: boolean; next?: () => void | Promise<void> } = {}): Promise<boolean> {
    let closed = false;
    opening?.fiber.interruptUnsafe();
    const operation = Effect.gen(function* () {
      const target = current;
      const finish = () => {
        current = undefined;
        set({ active: undefined, saveStatus: undefined });
        navigation.show(undefined);
      };
      if (target && discard) {
        finish();
        yield* Scope.close(target.scope, Exit.void);
      } else if (target) {
        const saved = yield* Effect.result(finishSaving(target, finish));
        if (Result.isFailure(saved)) return unsaved(saved.failure);
      }
      closed = true;
      if (!next) return;
      const changed = yield* Effect.result(Effect.tryPromise(async () => next()));
      if (Result.isFailure(changed)) set({ error: "Could not change accounts. Try again." });
    });
    const task = run(exclusive({ operation: "close" }, operation));
    return task ? task.done.then(() => closed) : Promise.resolve(false);
  }

  function start() {
    const lifetime = Scope.makeUnsafe();
    scope = lifetime;
    list();
    // Another tab may have changed the list.
    const refresh = () => list();
    // Saving cannot reliably finish while the tab closes, so ask the user to wait.
    const warn = (event: BeforeUnloadEvent) => {
      if (current?.autosave.dirty()) event.preventDefault();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("beforeunload", warn);
      scope = current = opening = listing = undefined;
      Effect.runFork(Scope.close(lifetime, Exit.void));
      set(idle);
    };
  }

  return { store, start };
}

export type SessionStore = ReturnType<typeof createSession>["store"];
