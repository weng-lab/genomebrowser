"use client";

import Check from "@mui/icons-material/Check";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState, type SyntheticEvent } from "react";
import type { RegionGroup } from "../regionGroupSchema";
import { groupColors } from "../regionGroups";

type GroupEdit = Pick<RegionGroup, "name" | "color">;

type GroupDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  /** The name and color the form starts with. */
  initial: GroupEdit;
  onSubmit: (edit: GroupEdit) => void;
  onClose: () => void;
};

/** Names a region group and picks its color, for a new group or an existing one. */
export function GroupDialog({ open, onClose, ...form }: GroupDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      {/* The dialog unmounts its content once closed, so each opening starts from `initial`. */}
      <GroupForm {...form} onClose={onClose} />
    </Dialog>
  );
}

function GroupForm({
  title,
  submitLabel,
  initial,
  onSubmit,
  onClose,
}: Omit<GroupDialogProps, "open">) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const colorLabel = useId();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ name: name.trim() || initial.name, color });
    onClose();
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ "&&": { pt: 1 } }}>
        <TextField
          autoFocus
          autoComplete="off"
          fullWidth
          label="Name"
          size="small"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Typography id={colorLabel} variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Color
        </Typography>
        <Box role="radiogroup" aria-labelledby={colorLabel} sx={{ display: "flex", gap: 1 }}>
          {groupColors.map((option) => (
            <ButtonBase
              key={option}
              role="radio"
              aria-checked={option === color}
              aria-label={option}
              onClick={() => setColor(option)}
              sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: option, color: "#fff" }}
            >
              {option === color ? <Check fontSize="small" /> : null}
            </ButtonBase>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {submitLabel}
        </Button>
      </DialogActions>
    </Box>
  );
}
