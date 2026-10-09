# Styling and text

The workspace applies its own MUI theme and baseline styles inside `Workspace`. Panel content inherits them, so MUI components in a page match the frame without extra setup.

## The theme

`Workspace` wraps its content in a `ThemeProvider` with the exported `theme` and renders MUI's `CssBaseline`. The baseline resets page margins and box sizing for the whole document, which suits the workspace's full-window layout. Apps that render other screens around the workspace, such as a sign-in page, can import `theme` to style them the same way.

Icons in `IconButton` and similar controls use a solid dark gray rather than MUI's default semi-transparent black. The current page's side bar icon uses the primary color.

## Text trimming

The theme's `Typography` and tooltip text is trimmed to its cap height and baseline with the CSS `text-box: trim-both cap alphabetic` property. A font reserves uneven space above and below its letters, so untrimmed text sits slightly high in anything that centers it, such as a title row or a button. Trimming removes that space so text centers on its visible letters and lines up with nearby icons.

The frame's title rows override trimming and use the same 20-pixel line height for side-panel titles, breadcrumb labels, and separators. This keeps their vertical alignment consistent, including in browsers without `text-box` support.

Render panel text through `Typography` to use the theme's typography and trimming:

```tsx
import Typography from "@mui/material/Typography";

<Typography variant="body2" color="text.secondary">
  No reports yet
</Typography>;
```

For text in other elements, spread the exported `textBoxTrim` style onto the element that directly contains the text:

```tsx
import Box from "@mui/material/Box";
import { textBoxTrim } from "@weng-lab/workspace";

<Box component="span" sx={{ ...textBoxTrim, display: "block" }}>
  3 selected
</Box>;
```

### Where trimming applies

`text-box` applies to the element that directly contains the text, and only when that element is a block or an inline box. A flex or grid container ignores it, and child elements do not inherit it. Text placed directly inside a flex container, such as a bare string in a flex `Box`, is not trimmed; wrap it in `Typography`.

Inline text is trimmed against the font of the block that contains it. When labels of different sizes share a line, make each label a block, for example with `Typography display="block"`, so each is trimmed against its own font.

### Height and clipping

Trimming removes the line-height space that some components use for their height. A component sized by its text, rather than by fixed dimensions, becomes shorter and may need padding. The theme adds padding to tooltips for this reason.

Text that clips its overflow, such as `Typography noWrap`, would also lose the parts of letters that extend past the cap height and baseline, like the tail of a "g". The theme gives `noWrap` text symmetric vertical padding so those parts stay visible without moving the text off center. Title rows use an untrimmed line box and remove this extra padding. Browsers without `text-box` support retain the normal line-height space.

[Back to the docs home](../README.md)
