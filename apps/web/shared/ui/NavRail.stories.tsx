import FolderOutlined from "@mui/icons-material/FolderOutlined";
import Logout from "@mui/icons-material/Logout";
import Schedule from "@mui/icons-material/Schedule";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import ViewTimelineOutlined from "@mui/icons-material/ViewTimelineOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavRail, type NavRailItem } from "./NavRail";

// Links like the app's, which lint keeps shared/ui from importing.
const browser: NavRailItem = { href: "#browser", label: "Browser", icon: <ViewTimelineOutlined /> };
const sessions: NavRailItem = { href: "#sessions", label: "Sessions", icon: <Schedule /> };
const collections: NavRailItem = {
  href: "#collections",
  label: "Collections",
  icon: <FolderOutlined />,
};
const settings: NavRailItem = { href: "#settings", label: "Settings", icon: <SettingsOutlined /> };

const brand = (
  <Box
    aria-hidden
    sx={{ width: 36, height: 36, my: 0.5, borderRadius: 1.5, bgcolor: "common.white" }}
  />
);

const meta = {
  title: "Components/NavRail",
  component: NavRail,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Box sx={{ display: "flex", height: 420 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    "aria-label": "Example",
    brand,
    sections: [[{ ...browser, current: "page" }, sessions], [collections]],
    bottom: [settings],
  },
} satisfies Meta<typeof NavRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentPage: Story = {};

/** A page inside a link's section, such as a session in the browser, marks it `location`. */
export const CurrentLocation: Story = {
  args: { sections: [[{ ...browser, current: "location" }, sessions], [collections]] },
};

export const WithFooter: Story = {
  args: {
    footer: (
      <IconButton aria-label="Sign out">
        <Logout />
      </IconButton>
    ),
  },
};

export const WithoutBrand: Story = { args: { brand: undefined } };
