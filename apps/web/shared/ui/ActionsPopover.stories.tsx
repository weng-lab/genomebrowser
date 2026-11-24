import Palette from "@mui/icons-material/Palette";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ActionsPopover } from "./ActionsPopover";
import { NameAndColor } from "./NameAndColor";
import { swatchColors } from "./color";

/**
 * A region group's actions: `NameAndColor` above the menu items. For a menu of actions alone,
 * use `ActionMenu`.
 */
const meta = {
  title: "Components/ActionsPopover",
  component: ActionsPopover,
  args: {
    label: "Actions for group Enhancers",
    children: (close) => (
      <>
        <NameAndColor
          nameLabel="Group name"
          initialName="Enhancers"
          onRename={fn()}
          onDone={close}
          color={{
            label: "Group color",
            colors: swatchColors,
            value: swatchColors[1].color,
            onChange: fn(),
            allowNone: true,
          }}
        />
        <MenuList dense aria-label="Actions for group Enhancers" sx={{ pt: 0 }}>
          <MenuItem onClick={close}>
            <ListItemIcon>
              <Palette fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Apply color to all regions" />
          </MenuItem>
          <Divider />
          <MenuItem onClick={close}>
            <ListItemText primary="Ungroup" />
          </MenuItem>
          <MenuItem onClick={close} sx={{ color: "error.main" }}>
            <ListItemText primary="Delete group and regions" />
          </MenuItem>
        </MenuList>
      </>
    ),
  },
} satisfies Meta<typeof ActionsPopover>;

export default meta;

/** Click the button to open it. The name field has focus. */
export const NameColorAndActions: StoryObj<typeof meta> = {};
