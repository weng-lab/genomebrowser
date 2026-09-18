# Settings form layout

Import the layout components and their corresponding `Props` types from `@weng-lab/genomebrowser-tracks/shared`. They arrange children without reading stores or committing edits.

## Usage

```tsx
import {
  TrackSettingsLayout,
  TrackSettingsSection,
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "@weng-lab/genomebrowser-tracks/shared";

export function SettingsLayoutExample() {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>Source controls go here.</TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
```

## `TrackSettingsLayout`

| Prop       | Type        | Default  | Description                                                         |
| ---------- | ----------- | -------- | ------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Top-level settings content. Direct children are separated by 12 px. |

## `TrackSettingsSection`

| Prop       | Type        | Default  | Description                                 |
| ---------- | ----------- | -------- | ------------------------------------------- |
| `title`    | `string`    | Required | Visible section legend.                     |
| `children` | `ReactNode` | Required | Controls or layouts grouped by the section. |

## `TrackSettingsFieldRow`

| Prop       | Type        | Default  | Description                                                                                                                            |
| ---------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Controls that belong together, such as a minimum and maximum. They share the row width and stack at viewport widths of 566 px or less. |

## `TrackSettingsFieldGrid`

| Prop       | Type        | Default  | Description                                                                   |
| ---------- | ----------- | -------- | ----------------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Controls that flow into auto-fitting columns with a 12 rem preferred minimum. |

## `TrackSettingsFullRow`

| Prop       | Type        | Default  | Description                                                                  |
| ---------- | ----------- | -------- | ---------------------------------------------------------------------------- |
| `children` | `ReactNode` | Required | Content that spans all columns when used as a `TrackSettingsFieldGrid` item. |

## Supporting types

`TrackSettingsLayoutProps`, `TrackSettingsSectionProps`, `TrackSettingsFieldRowProps`, `TrackSettingsFieldGridProps`, and `TrackSettingsFullRowProps` are the prop contracts above. Components accept only these props; they do not forward arbitrary DOM props.

## Accessibility

`TrackSettingsSection` uses a fieldset and visible legend. Other layout components are non-interactive containers. Responsive stacking preserves source order. Children provide their own labels and keyboard behavior.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
