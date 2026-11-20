import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTheme, type PaletteColor } from "@mui/material/styles";
import Add from "@mui/icons-material/Add";
import CreateNewFolder from "@mui/icons-material/CreateNewFolder";
import Download from "@mui/icons-material/Download";
import Sort from "@mui/icons-material/Sort";
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";
import { ControlToolbar } from "@weng-lab/genomebrowser-ui";
import { brand, navigation } from "../composition/navigation";
import { EmptyState } from "../shared/ui/EmptyState";
import { NavRail } from "../shared/ui/NavRail";
import { SectionHeader } from "../shared/ui/SectionHeader";
import { StatusTag } from "../shared/ui/StatusTag";

// A browser store for the toolbar preview, as in the UI package's ControlToolbar docs.
const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_365_153, end: 53_405_654 },
  trackWidth: 900,
});

/** Every shared/ui component, with the app theme, in the states screens use. */
export function Gallery() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 5, p: 3, maxWidth: 1200 }}>
      <Typography variant="h5" component="h1">
        Design
      </Typography>
      <Palette />
      <Section title="NavRail" source="shared/ui/NavRail.tsx">
        <Box sx={{ display: "flex", height: 420, border: 1, borderColor: "divider" }}>
          <NavRail
            aria-label="Example"
            brand={brand}
            // The app's real links, with the first one current.
            sections={navigation.sections.map((items, group) =>
              items.map((item, index) => ({
                ...item,
                current: group === 0 && index === 0 ? ("page" as const) : undefined,
              })),
            )}
            bottom={navigation.bottom}
          />
        </Box>
      </Section>
      <Section title="StatusTag" source="shared/ui/StatusTag.tsx">
        <Row>
          <StatusTag label="All changes saved" tone="success" />
          <StatusTag label="Saving…" busy />
          <StatusTag label="Retrying…" tone="warning" busy />
          <StatusTag label="Not saved" tone="error" />
          <StatusTag label="Unsaved" />
        </Row>
      </Section>
      <Section title="SectionHeader" source="shared/ui/SectionHeader.tsx">
        {/* Closed, then with the first action's part open. */}
        {[false, true].map((expanded) => (
          <Box key={String(expanded)} sx={{ width: 280, p: 1.5, bgcolor: "background.paper" }}>
            <SectionHeader
              title="Regions"
              actions={[
                { label: "Add region", icon: <Add />, expanded },
                { label: "Add group", icon: <CreateNewFolder /> },
              ]}
            />
          </Box>
        ))}
      </Section>
      <Section title="EmptyState" source="shared/ui/EmptyState.tsx">
        <Box sx={{ width: 280, p: 1.5, bgcolor: "background.paper" }}>
          <EmptyState
            title="No regions yet"
            description="Add the current view, or enter coordinates, to save a region."
          />
        </Box>
      </Section>
      <Section
        title="ControlToolbar"
        source="@weng-lab/genomebrowser-ui, styled by shared/ui/theme.ts"
      >
        <Box sx={{ bgcolor: "background.subtle", p: 2 }}>
          <ControlToolbar
            browserStore={useBrowserStore}
            // Search needs the app's server; the rest of the toolbar works on its own.
            search={{
              assembly: "GRCh38",
              graphqlUrl: "/api/screen-graphql",
              queries: ["Coordinate"],
            }}
            managementActions={
              <>
                <Button size="small" startIcon={<Sort />}>
                  Sort tracks
                </Button>
                <Button size="small" startIcon={<Download />}>
                  Download
                </Button>
              </>
            }
          />
        </Box>
      </Section>
    </Box>
  );
}

function Palette() {
  const { palette } = useTheme();
  const tones = ({ main, dark, light, contrastText }: PaletteColor) => ({
    main,
    dark,
    light,
    contrastText,
  });
  const groups: [string, Record<string, string>][] = [
    ["Text", { ...palette.text }],
    ["Primary", tones(palette.primary)],
    ["Secondary", tones(palette.secondary)],
    ["Background", { ...palette.background, divider: palette.divider }],
  ];
  return (
    <Section title="Palette" source="shared/ui/theme.ts">
      {groups.map(([name, colors]) => (
        <Box key={name}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            {name}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {Object.entries(colors).map(([key, color]) => (
              <Box key={key} sx={{ width: 132 }}>
                <Box
                  sx={{
                    height: 56,
                    bgcolor: color,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1.5,
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {key}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.75 }}
                >
                  {color}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Section>
  );
}

function Section({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: ReactNode;
}) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {source}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>{children}</Box>
  );
}
