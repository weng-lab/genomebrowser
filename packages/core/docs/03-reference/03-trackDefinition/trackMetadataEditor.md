# TrackMetadataEditor

`TrackMetadataEditor` edits a track's [metadata](trackInstances.md#trackmetadata) as name and value rows. Each field holds text, a number, or true or false. The browser's track settings dialog already shows it for every track, so use it directly only to collect metadata somewhere else, such as before a track is created.

## Usage

The editor works on rows rather than a finished record, because typing passes through states a record can't hold, such as a name with no value yet. Build rows with `metadataRows` and turn them into metadata with `metadataFromRows`:

```tsx
import { useState } from "react";
import {
  TrackMetadataEditor,
  metadataFromRows,
  metadataRows,
  type TrackMetadata,
  type TrackMetadataRow,
} from "@weng-lab/genomebrowser";

export function NewTrackMetadata({ onCreate }: { onCreate: (metadata: TrackMetadata) => void }) {
  const [rows, setRows] = useState<TrackMetadataRow[]>(() => metadataRows({ Assay: "ChIP-seq" }));
  const result = metadataFromRows(rows);

  return (
    <>
      <TrackMetadataEditor value={rows} onChange={setRows} />
      <button
        type="button"
        disabled={!result.ok}
        onClick={() => result.ok && onCreate(result.metadata)}
      >
        Create track
      </button>
    </>
  );
}
```

The editor shows under each row what keeps it from being stored, so a caller only checks `ok` before using the metadata.

## Examples

### In the track settings dialog

Every track's settings dialog has a **Metadata** section between the module's settings and the image downloads. No setup is needed. Each edit that leaves every field valid replaces the track's metadata at once, as other settings apply; while a field isn't valid, the track keeps its last valid metadata. When the track's metadata changes another way while the dialog is open, such as through `updateTrack`, the rows are rebuilt from it and edits that weren't valid yet are dropped. Metadata edits don't render or refetch the track.

## API

### TrackMetadataEditorProps

`TrackMetadataEditorProps` is exported from the package root.

| Prop       | Type                                 | Default  | Description                                                                       |
| ---------- | ------------------------------------ | -------- | --------------------------------------------------------------------------------- |
| `value`    | `readonly TrackMetadataRow[]`        | Required | The fields being edited, in display order.                                        |
| `onChange` | `(rows: TrackMetadataRow[]) => void` | Required | Called with the new rows after every edit, including adding and removing a field. |
| `disabled` | `boolean`                            | `false`  | Disables every control.                                                           |

### TrackMetadataRow and TrackMetadataValueType

`TrackMetadataRow` and `TrackMetadataValueType` are exported from the package root. `TrackMetadataValueType` is `"text"`, `"number"`, `"boolean"`, or `"none"`; `"none"` is a stored `null`.

| Field     | Type                        | Description                                                                                                                                                     |
| --------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`     | `string`                    | Identifies the row while it's edited, including while its name changes. It isn't stored.                                                                        |
| `name`    | `string`                    | The field name, as typed.                                                                                                                                       |
| `type`    | `TrackMetadataValueType`    | Which kind of value the field holds.                                                                                                                            |
| `text`    | `string`                    | What's typed for a text or number value. Switching between Text and Number keeps it.                                                                            |
| `checked` | `boolean`                   | The value of a true/false field.                                                                                                                                |
| `stored`  | `{ name, value }`, optional | The field as the track stores it, on rows `metadataRows` builds. See [metadataFromRows](#metadatafromrows-trackmetadatarowsresult-and-trackmetadatarowproblem). |

### metadataRows

`metadataRows(metadata)` returns one row for each field of a `TrackMetadata` record, in the record's order, or no rows for `undefined`. Text becomes a `"text"` row, a number a `"number"` row with its digits as `text`, `true` or `false` a `"boolean"` row, and `null` a `"none"` row. Each row remembers the field in `stored`.

### metadataFromRows, TrackMetadataRowsResult, and TrackMetadataRowProblem

`metadataFromRows(rows)` returns `{ ok: true, metadata }` or `{ ok: false, problems }`. Each `TrackMetadataRowProblem` has the row's `key`, a `message` to show, and `incomplete`, which is true when the row only needs a name or value typed. The editor shows incomplete rows as hints and other problems as errors.

- A row with neither a name nor a typed value is skipped, so a field just added isn't a problem.
- Every other row needs a name that isn't one of [`builtInTrackFields`](#builtintrackfields) and isn't used by another row. `__proto__` is refused too: a JavaScript object can't hold it as an ordinary field, and saved sessions drop it when they're read.
- A text field needs text, and a number field a finite number. Clearing a number field is incomplete; it isn't stored as `0`.
- Names and text are stored as typed, without trimming.
- A row from `metadataRows` keeps its stored name and value until its name or value changes, even when the editor wouldn't accept them in a new field, such as empty text or a name like `title`. Only a name another row also uses is still a problem. That way a stored field never holds back edits to the others, and fields nobody edits keep their exact values.

### builtInTrackFields

`builtInTrackFields` is `["id", "title", "type"]`, exported from the package root. Collection views and sorting use these names for a track's own ID, title, and type, so a metadata field with one of them would be hidden there. `metadataFromRows` refuses them, and [collection validation](../05-collectionsAndSchemas/validateTrackCollection.md) treats them as built-in view fields.

## Accessibility

The editor is a fieldset named "Metadata", and each row is a fieldset named "Field 1", "Field 2", and so on, with inputs labeled **Name**, **Type**, and **Value**. A row's message is linked to its name and value inputs through `aria-describedby`. Each remove button is named after its field, such as "Remove the field Assay". **Add field** moves focus to the new row's name. Hints for incomplete rows aren't styled as errors, and errors also say what's wrong in words.

## Notes

- **No value** appears only for a field that already holds `null`, for example one set through the track store or by an agent. New fields need a value.
- The editor doesn't limit how long names or values are. An application that limits metadata checks the result of `metadataFromRows` itself.
- Editing several tracks at once isn't supported yet.

[Back to track definition](README.md) · [Track settings](trackSettings.md) · [Complete export index](../README.md#public-export-index)
