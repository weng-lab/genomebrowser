import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme, type PaletteColor } from "@mui/material/styles";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Download from "@mui/icons-material/Download";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import Highlight from "@mui/icons-material/Highlight";
import PanTool from "@mui/icons-material/PanTool";
import Schedule from "@mui/icons-material/Schedule";
import Search from "@mui/icons-material/Search";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import Sort from "@mui/icons-material/Sort";
import ViewTimelineOutlined from "@mui/icons-material/ViewTimelineOutlined";
import ZoomIn from "@mui/icons-material/ZoomIn";
import { LabeledGroup } from "@weng-lab/genomebrowser-ui";
import { ControlAction, ControlStrip } from "../shared/ui/ControlStrip";
import { NavRail } from "../shared/ui/NavRail";
import { StatusTag } from "../shared/ui/StatusTag";

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
            brand={
              <Box sx={{ width: 36, height: 36, my: 0.5, borderRadius: 1.5, bgcolor: "white" }} />
            }
            sections={[
              [
                {
                  href: "#browser",
                  label: "Browser",
                  icon: <ViewTimelineOutlined />,
                  current: "page",
                },
                { href: "#sessions", label: "Sessions", icon: <Schedule /> },
              ],
              [{ href: "#collections", label: "Collections", icon: <FolderOutlined /> }],
            ]}
            bottom={[{ href: "#settings", label: "Settings", icon: <SettingsOutlined /> }]}
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
      <Section title="ControlStrip and ControlAction" source="shared/ui/ControlStrip.tsx">
        <Box sx={{ bgcolor: "background.subtle", p: 2 }}>
          <ControlStrip aria-label="Example controls">
            <LabeledGroup title="Region">
              <Row>
                <Typography variant="body2">chr12:53,365,154-53,405,654</Typography>
                <IconButton size="small" aria-label="Search">
                  <Search fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="Copy">
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Row>
            </LabeledGroup>
            <LabeledGroup title="Interaction">
              <ModeToggle />
            </LabeledGroup>
            <LabeledGroup title="Manage">
              <ControlAction icon={<Sort />} onClick={() => {}}>
                Sort tracks
              </ControlAction>
              <ControlAction icon={<Download />} onClick={() => {}}>
                Download
              </ControlAction>
            </LabeledGroup>
          </ControlStrip>
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

function ModeToggle() {
  const [mode, setMode] = useState("pan");
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      aria-label="Mode"
      value={mode}
      onChange={(_, value: string | null) => value && setMode(value)}
    >
      <ToggleButton value="pan" aria-label="Pan">
        <PanTool fontSize="small" />
      </ToggleButton>
      <ToggleButton value="zoom" aria-label="Zoom">
        <ZoomIn fontSize="small" />
      </ToggleButton>
      <ToggleButton value="highlight" aria-label="Highlight">
        <Highlight fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
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
