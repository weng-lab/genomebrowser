# LabeledGroup

`LabeledGroup` wraps any children in the same outlined fieldset and label used by the built-in sections. It needs no browser store or provider.

## Usage

```tsx
import { LabeledGroup } from "@weng-lab/genomebrowser-ui";

export function ExportControls({ onExport }: { onExport: () => void }) {
  return (
    <LabeledGroup title="Export" sx={{ flex: "1 1 240px", maxWidth: 440 }}>
      <button onClick={onExport}>Download image</button>
    </LabeledGroup>
  );
}
```

The group styles its frame and label. Arrange its children with your own layout when needed.

## API

### LabeledGroupProps

`LabeledGroup` and `LabeledGroupProps` are exported from the package root.

| Prop       | Type             | Default  | Description                                                                                                                                   |
| ---------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`    | `string`         | Required | Visible label rendered as the fieldset's legend.                                                                                              |
| `children` | `ReactNode`      | Required | Controls or other content inside the outline.                                                                                                 |
| `sx`       | `SxProps<Theme>` | Omitted  | MUI styles applied after the default fieldset styles. Accepts an object, theme callback, or array. Use it to customize sizing and appearance. |

The outline, label, and spacing use the host's MUI theme. The fieldset and legend provide semantic grouping; children retain their own keyboard and focus behavior.

## Theming

Every `LabeledGroup`, including the ones inside the built-in control sections, reads styles from the `GbLabeledGroup` entry in the host theme's `components`. `styleOverrides.root` styles the fieldset and `styleOverrides.legend` styles the title. Each accepts a style object or a function of `{ theme }`. Importing the package adds this entry to MUI's `Components` type.

```tsx
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  components: {
    GbLabeledGroup: {
      styleOverrides: {
        root: ({ theme }) => ({ backgroundColor: theme.palette.background.paper }),
      },
    },
  },
});
```

Theme styles apply after the default frame styles and before `sx`, so one group's `sx` still wins.

Return to [Shared UI](README.md).
