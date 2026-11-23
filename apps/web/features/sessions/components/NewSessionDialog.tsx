"use client";

import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { DialogForm } from "../../../shared/ui/DialogForm";
import { supportedAssemblies } from "../../assemblies/assemblies";
import { useSession } from "../SessionProvider";

/** The name a new session gets when none is entered. */
const DEFAULT_NAME = "New session";

/** Whether sessions cannot be created now: they are not ready, or another operation runs. */
export const useCreateDisabled = () =>
  useSession((session) => session.status !== "ready" || session.pending !== undefined);

type NewSessionDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the dialog closes, once creating the session has started. */
  onCreate?: () => void;
};

/** Asks for a new session's name and assembly, then creates and opens it. */
export function NewSessionDialog({ open, onClose, onCreate }: NewSessionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      {/* The dialog unmounts its content once closed, so each opening starts empty. */}
      <NewSessionForm onClose={onClose} onCreate={onCreate} />
    </Dialog>
  );
}

function NewSessionForm({ onClose, onCreate }: Omit<NewSessionDialogProps, "open">) {
  const create = useSession((session) => session.create);
  const disabled = useCreateDisabled();
  const [name, setName] = useState("");
  const [assembly, setAssembly] = useState(supportedAssemblies[0].id);

  function handleSubmit() {
    onClose();
    // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
    void create({ name: name.trim() || DEFAULT_NAME, assembly });
    onCreate?.();
  }

  return (
    <DialogForm
      title="New session"
      submitLabel="Create"
      submitDisabled={disabled}
      onSubmit={handleSubmit}
      onCancel={onClose}
    >
      <TextField
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The dialog opens to name the session.
        autoFocus
        label="Name"
        placeholder={DEFAULT_NAME}
        value={name}
        onChange={(event) => setName(event.target.value)}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }}
      />
      <TextField
        select
        label="Assembly"
        value={assembly}
        onChange={(event) => setAssembly(event.target.value)}
      >
        {supportedAssemblies.map(({ id, label }) => (
          <MenuItem key={id} value={id}>
            {label}
          </MenuItem>
        ))}
      </TextField>
    </DialogForm>
  );
}
