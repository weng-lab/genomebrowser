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
import { useId, useState, type KeyboardEvent, type SyntheticEvent } from "react";
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
  const checkedIndex = groupColors.findIndex((option) => option.color === color);

  /** Arrow keys choose the previous or next color and focus it, as in a radio group. */
  function handleColorKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + groupColors.length) % groupColors.length;
    setColor(groupColors[next].color);
    const swatches = event.currentTarget.parentElement?.querySelectorAll("[role='radio']");
    (swatches?.[next] as HTMLElement | undefined)?.focus();
  }

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
          {groupColors.map((option, index) => (
            <ButtonBase
              key={option.color}
              role="radio"
              aria-checked={index === checkedIndex}
              aria-label={option.name}
              // One Tab stop: the checked color, or the first while none is.
              tabIndex={index === Math.max(checkedIndex, 0) ? 0 : -1}
              onClick={() => setColor(option.color)}
              onKeyDown={(event) => handleColorKeyDown(event, index)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: option.color,
                color: "#fff",
                "&.Mui-focusVisible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              {index === checkedIndex ? <Check fontSize="small" /> : null}
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
