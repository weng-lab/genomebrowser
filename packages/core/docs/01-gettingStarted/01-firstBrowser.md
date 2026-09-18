# Create a genome browser

To embed a genome browser in a React application, create a browser store and a track store, then pass both to `GenomeBrowser`. Tracks share the browser's genomic viewport. The following example displays a coordinate ruler and a BigWig signal track in a responsive container.

This example requires React 19.2+ and a BigWig file accessible by URL. Use a file aligned to the human hg38 assembly and select a region where it contains data.

## Choose a setup path

Use the starter to generate a complete application, or install the packages in an existing React application. These are alternative setup paths.

### Option 1: Generate an application

To start a new application, run the starter commands below. The starter creates a Vite and React project with a working browser, sample tracks, and application controls:

```sh
npm create @weng-lab/genomebrowser@2.0.0 my-browser
cd my-browser
npm install
npm run dev
```

The generated application already includes the browser dependencies and setup. Continue with its README and `docs/` for customization. The remaining sections on this page build a minimal browser in an existing application.

### Option 2: Use an existing application

For an existing React application, core provides the browser component and its state, while the tracks package supplies the ruler and BigWig implementations. The track settings also depend on Emotion and MUI. Install these packages together:

```sh
pnpm add @weng-lab/genomebrowser@2.0.0 @weng-lab/genomebrowser-tracks@2.0.0 @emotion/react@11 @emotion/styled@11 @mui/material@7
```

This setup assumes the application already uses `react` and `react-dom` 19.2 or later. The browser runs on the client, where it can measure the layout and render interactive SVG tracks.

## Create the browser

A browser connects three pieces: a browser store that identifies the region to display, a track store that describes the track configurations to draw, and the `GenomeBrowser` component that fetches and renders those tracks. The application owns both stores, so application controls can later use them to navigate or change tracks.

The following steps build a single `Browser.tsx` file, with imports at the top and store declarations outside the React component. Keeping the stores at file scope preserves their state across React renders. It also means that multiple copies of the component share the same region and tracks. The stores are [Zustand](https://zustand.docs.pmnd.rs/) hooks, so their names begin with `use`.

### Define the assembly and initial region

The browser store establishes which genome is being displayed and where the view begins. Its `assembly` defines the available chromosomes and their lengths, while `region` selects a region within one of those chromosomes. This example uses the built-in human `hg38` assembly. Other built-in assemblies and custom definitions are covered in the [assembly reference](../03-reference/02-assembliesAndRegions/assemblies.md).

A region has a chromosome name, a start coordinate, and an end coordinate. Coordinates are zero-based and half-open: the start is included and the end is excluded. The region below therefore spans 100,000 bases on `chr1`. The chromosome name must match both the assembly and the data file, and the selected region should contain signal from the BigWig file.

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: {
    chromosome: "chr1",
    start: 1_000_000,
    end: 1_100_000,
  },
});
```

### Define the tracks

A track module supplies the behavior for a type of data, including how to fetch and render it. A track instance supplies the values for one row, such as its title and data URL. Multiple tracks can use the same module with different configurations.

Each instance has common row properties in `base` and module-specific options in `config`. The base properties used here are a unique `id`, which identifies the row in the store, and a `title`, which labels it in the browser. The ruler needs no additional configuration to show coordinates. The BigWig track needs a file URL, supplied through `config.url`.

Create the track store by registering both modules in `modules` and placing their configured instances in `tracks`. The array establishes the initial display order, so the ruler comes first and the signal appears below it. Replace `YOUR_URL_HERE` with the BigWig file URL before running the example.

```tsx
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

const useTrackStore = createTrackStore({
  modules: [rulerModule, bigWigModule],
  tracks: [
    rulerModule.create({
      base: { id: "ruler", title: "Coordinates" },
      config: {},
    }),
    bigWigModule.create({
      base: { id: "signal", title: "Signal" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
```

### Connect the stores to the component

`GenomeBrowser` requests data for the region and renders the tracks within the available layout width. The wrapper below fills its parent, with `minWidth: 0` allowing it to shrink inside a flex or grid layout. The component measures that width automatically and follows subsequent size changes.

```tsx
import { GenomeBrowser } from "@weng-lab/genomebrowser";

export function Browser() {
  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </div>
  );
}
```

Render `Browser` from `App.tsx`:

```tsx
import { Browser } from "./Browser";

export default function App() {
  return <Browser />;
}
```

Once the data loads, the page displays a coordinate ruler above the signal track. Resizing the page changes the drawing width while keeping the same genomic region in view.

## Access browser state and actions

Inside a React component, call the store hook with a selector for each value or action the component needs. Selecting a value subscribes the component to changes in that value. Selecting an action provides the function to call from an event handler; core's actions keep stable identities, so selecting `zoom` does not subscribe to changes in the region.

Add this component to `Browser.tsx` and render `<RegionControls />` above `GenomeBrowser` in the existing wrapper. It selects the region for its readout and the zoom action for its button:

```tsx
function RegionControls() {
  const region = useBrowserStore((state) => state.region);
  const zoom = useBrowserStore((state) => state.zoom);

  return (
    <div>
      <p>
        {region.chromosome}:{region.start}–{region.end}
      </p>
      <button
        type="button"
        onClick={() => {
          const result = zoom(0.5);
          if (!result.ok) console.error(result.error);
        }}
      >
        Zoom in
      </button>
    </div>
  );
}
```

Outside React, such as in a module callback defined at file scope, `useBrowserStore.getState()` reads the current state and actions without a subscription. It is also useful when an event needs a fresh value that is not displayed by the component. Reading `getState().region` during rendering does not keep a readout updated. The track store follows the same pattern: select values and actions in components, and use `getState()` for imperative access outside React.

Application controls use the stores created by the application. Reusable renderers, settings forms, and tooltips obtain their hosting stores through [useGenomeBrowser](../03-reference/01-browserSetup/useGenomeBrowser.md), then use the returned hooks with selectors in the same way.

## If the signal does not appear

Check that `YOUR_URL_HERE` has been replaced with a BigWig URL, that the file uses hg38 coordinates, and that it contains signal in the chosen region. Change the initial `region` to a region covered by the file if needed.

If the track shows a request error, inspect the failed request in the browser's developer tools. The URL must serve the BigWig file itself, and the server must allow the application to read it. A file hosted on another origin needs appropriate CORS access.

If neither track appears, check that the containing layout has a positive width. The responsive browser waits for a usable container measurement before drawing tracks.

## Further reading

- [Track store](../03-reference/01-browserSetup/trackStore.md): adding tracks, updating settings, and changing display order.
- [Browser navigation](../03-reference/01-browserSetup/browserStore.md#navigation): changing the visible region through store actions.
- [Sizing and magnification](../03-reference/01-browserSetup/GenomeBrowser.md#examples): fixed drawing widths and scaling text and controls.
