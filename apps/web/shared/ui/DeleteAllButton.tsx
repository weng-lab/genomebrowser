"use client";

import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import { useState } from "react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { formButtonSx } from "./FormCard";

type DeleteAllButtonProps = {
  /** The button's label, such as “Delete all regions”. */
  label: string;
  disabled?: boolean;
  /** The confirmation's title, its text, and its delete button's label. */
  confirmTitle: string;
  confirmText: string;
  confirmLabel: string;
  /** Called once the deletion is confirmed, after the confirmation closes. */
  onDelete: () => void;
};

/**
 * A full-width button at the foot of a panel that deletes everything in it, after asking,
 * since that cannot be undone.
 */
export function DeleteAllButton({
  label,
  disabled,
  confirmTitle,
  confirmText,
  confirmLabel,
  onDelete,
}: DeleteAllButtonProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<DeleteOutline />}
        disabled={disabled}
        onClick={() => setConfirming(true)}
        // A quiet border, with the form buttons' sentence-case label.
        sx={{ ...formButtonSx, borderColor: "divider", fontWeight: "fontWeightMedium" }}
      >
        {label}
      </Button>
      <ConfirmDeleteDialog
        open={confirming}
        title={confirmTitle}
        text={confirmText}
        confirmLabel={confirmLabel}
        onConfirm={onDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
