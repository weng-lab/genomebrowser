import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactNode, SyntheticEvent } from "react";
import { dialogActionsSx, dialogFieldsSx } from "./dialogLayout";

export type DialogFormProps = {
  title: string;
  /** The filled button that submits the form, such as "Create" or "Save". */
  submitLabel: string;
  submitDisabled?: boolean;
  /** Called when the form is submitted, by its button or Enter in a field. */
  onSubmit: () => void;
  onCancel: () => void;
  /** The form's fields, stacked. */
  children: ReactNode;
};

/**
 * A dialog's content as a form: a title, stacked fields, then Cancel and a filled submit
 * button. Render it inside a component that holds the fields' state, placed in a `Dialog`.
 * The dialog unmounts its content once closed, so each opening starts from fresh state. For
 * a short form set into a panel, use `FormCard`; to ask before an action, `ConfirmDialog`.
 */
export function DialogForm({
  title,
  submitLabel,
  submitDisabled = false,
  onSubmit,
  onCancel,
  children,
}: DialogFormProps) {
  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={dialogFieldsSx}>{children}</DialogContent>
      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Box>
  );
}
