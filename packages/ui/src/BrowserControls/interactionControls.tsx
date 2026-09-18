import { Box } from "@mui/material";
import { SelectionControls, type SelectionControlsProps } from "./selectionControls";
import { LabeledGroup } from "../LabeledGroup/labeledGroup";

export type InteractionControlsProps = SelectionControlsProps;

export function InteractionControls(props: InteractionControlsProps) {
  return (
    <LabeledGroup title="Interaction">
      <Box sx={{ "& .MuiToggleButton-root": { height: 32, px: 1 } }}>
        <SelectionControls {...props} />
      </Box>
    </LabeledGroup>
  );
}
