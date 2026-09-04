# Customization

For a dataset change, the useful inputs are its URL, format, assembly, label, and a region of interest. For an interface change, describe the intended interaction or comparison. An agent can use that context to implement and verify the change.

## Add a dataset

Add an entry to `tracks` in `collections/default-tracks.json`. For example:

```json
{
  "type": "bigwig",
  "id": "my-signal",
  "title": "My experiment",
  "display": "full",
  "height": 50,
  "color": "#336699",
  "config": {
    "url": "YOUR_URL_HERE"
  },
  "metadata": {}
}
```

Use the actual dataset URL and a unique track ID. This makes the dataset available in Select tracks. Other formats have different configuration options; consult the tracks package documentation linked in [AGENTS.md](../AGENTS.md#package-documentation).

Data must be accessible over HTTP or HTTPS with the [required server support](deployment.md#host-your-genomic-files).

## Choose startup tracks

Set `defaultTrackIds` in `src/collections.ts`, in display order:

```ts
export const defaultTrackIds = ["default-tracks::genes", "default-tracks::my-signal"];
```

Each value is `collection-id::track-id`. These tracks load at startup and are restored by Reset. Remove corresponding default IDs when deleting entries; keep IDs stable when only changing labels.

Additional collections need unique collection IDs and inclusion in `trackCollections`.

## Change assembly or region

Update `assembly` and `region` in `src/stores.ts`, along with matching collection data and startup IDs. Changing the assembly does not convert genomic files.

Built-in assemblies include `hg38`, `mm10`, `ce11`, `dm6`, and `tair10`. Search follows the browser assembly and supports hg38/GRCh38 and mm10 only.

Coordinates are zero-based and half-open: `chr1:0-100` covers the first 100 bases. Use a normal hyphen in coordinate strings.

## Extend the interface or track types

Page content and controls are ordinary React components. Keep state with the component that uses it, and preserve the [track initialization behavior](architecture.md#why-the-track-picker-stays-on-the-page) when changing the layout.

For a new data format or rendering style, check existing modules first. Custom modules use the core package's `docs/customTrackModules.md`; register them in `myModules` and run `npm run schema` afterward.

Complete the [verification steps](../AGENTS.md#verification), including loading changed tracks at a representative region.
