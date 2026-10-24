import { Box } from "@mui/material";
import { SelectionControls, type SelectionControlsProps } from "./selectionControls";
import { LabeledGroup } from "../LabeledGroup/labeledGroup";

export type InteractionControlsProps = SelectionControlsProps;

export function InteractionControls(props: InteractionControlsProps) {
  return (
    <LabeledGroup title="Interaction">
      <Box sx={{ "& .MuiToggleButton-root": { width: 32, height: 32, p: 0 } }}>
        <SelectionControls {...props} />
      </Box>
    </LabeledGroup>
  );
}
