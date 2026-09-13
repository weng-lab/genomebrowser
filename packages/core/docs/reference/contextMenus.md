# Context menus

The browser's track context menu lets users choose a display mode or remove a track. `GenomeBrowser` owns the menu state internally. Components rendered inside it can read or change that state through `useContextMenuStore`.

## useContextMenuStore

`useContextMenuStore<T>(selector: (state: ContextMenuStore) => T): T` subscribes to selected menu state or actions from the surrounding browser. It throws outside a `GenomeBrowser` context.

A custom renderer can open the existing menu at a pointer position:

```tsx
import { useContextMenuStore } from "@weng-lab/genomebrowser";

export function TrackMenuTarget({ trackId }: { trackId: string }) {
  const openMenu = useContextMenuStore((state) => state.openContextMenu);
  return (
    <rect
      width={100}
      height={20}
      onContextMenu={(event) => {
        event.preventDefault();
        openMenu(trackId, { x: event.clientX, y: event.clientY });
      }}
    />
  );
}
```

This example adds a pointer trigger only. The built-in track area already supplies its own context-menu trigger; use the hook when a custom component needs explicit control.

## createContextMenuStore

`createContextMenuStore(): ContextMenuStoreInstance` creates an independent Zustand store with the state and actions below. It takes no options.

```ts
import { createContextMenuStore } from "@weng-lab/genomebrowser";

const useMenuState = createContextMenuStore();
useMenuState.getState().openContextMenu("signal", { x: 100, y: 200 });
useMenuState.getState().closeContextMenu();
```

This standalone store does not open a `GenomeBrowser` menu. The browser has no public prop for replacing its internal context-menu store. Use the context hook to control a mounted browser, or use the standalone state in UI you implement yourself.

## ContextMenuStore and ContextMenuStoreInstance

| State      | Type                    | Initial value    | Description                               |
| ---------- | ----------------------- | ---------------- | ----------------------------------------- |
| `open`     | `boolean`               | `false`          | Whether the menu is requested to be open. |
| `trackId`  | `string` or `undefined` | `undefined`      | Track targeted by the last open action.   |
| `position` | `ContextMenuPosition`   | `{ x: 0, y: 0 }` | Requested pointer position.               |

`ContextMenuStoreInstance` is `UseBoundStore<StoreApi<ContextMenuStore>>`, providing a selector hook, `getState()`, subscriptions, and the underlying Zustand API. Keep factory-created stores stable and unsubscribe from external subscriptions when their owner is disposed.

### Actions

`openContextMenu(trackId: string, position: ContextMenuPosition): void` sets all three fields. It does not check track existence or validate coordinates. The browser renders no menu if the target track is absent.

`closeContextMenu(): void` sets `open` to false while retaining the last track ID and position. These actions do not return mutation results.

### ContextMenuPosition

`ContextMenuPosition` is `{ x: number; y: number }`, measured from the viewport origin in CSS pixels, as in `MouseEvent.clientX` and `clientY`. These are not genomic coordinates or logical SVG coordinates. The browser adjusts the menu's actual position near viewport edges without changing the stored position.

## Built-in menu behavior

The menu shows registered display names and a remove button. Actions are disabled while browser interactions are blocked, and a successful action closes it. Clicking outside, pressing Escape, or scrolling outside the menu dismisses it. Scrolling within a tall menu keeps it open. Resizing the viewport recalculates its placement.

The choices are native buttons. The component does not implement ARIA menu roles, arrow-key menu navigation, or automatic focus placement/restoration. Applications implementing another menu are responsible for its accessible interaction design.
