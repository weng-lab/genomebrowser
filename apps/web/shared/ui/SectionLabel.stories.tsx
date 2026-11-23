import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SectionLabel } from "./SectionLabel";

const meta = {
  title: "Components/SectionLabel",
  component: SectionLabel,
  args: { id: "recent", children: "Recent sessions" },
  decorators: [
    (Story) => (
      <Box sx={{ width: 280, bgcolor: "background.paper" }}>
        <Story />
        {/* The dense rows the label lines up with. */}
        <List dense aria-labelledby="recent">
          {["Alpha", "Beta"].map((name) => (
            <ListItemButton key={name} sx={{ mx: 0.5, px: 1, py: 0.75, borderRadius: 1 }}>
              <ListItemText primary={name} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    ),
  ],
} satisfies Meta<typeof SectionLabel>;

export default meta;

export const AboveList: StoryObj<typeof meta> = {};
