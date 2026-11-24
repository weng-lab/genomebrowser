"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { FormCard, FormCardActions } from "../../../shared/ui/FormCard";
import { supportedAssemblies } from "../../assemblies/assemblies";
import { useSession } from "../SessionProvider";

/** The name a new session gets when none is entered. */
const DEFAULT_NAME = "New session";

/** Whether sessions cannot be created now: they are not ready, or another operation runs. */
export const useCreateDisabled = () =>
  useSession((session) => session.status !== "ready" || session.pending !== undefined);

type NewSessionFormProps = {
  id: string;
  /** Called once creating the session has started, or on Cancel or Escape, to close the form. */
  onClose: () => void;
};

/** The Sessions section's form for a new session: its name and assembly. Create opens it. */
export function NewSessionForm({ id, onClose }: NewSessionFormProps) {
  const create = useSession((session) => session.create);
  const disabled = useCreateDisabled();
  const [name, setName] = useState("");
  const [assembly, setAssembly] = useState(supportedAssemblies[0].id);

  const submit = () => {
    if (disabled) return;
    onClose();
    // oxlint-disable-next-line typescript/no-floating-promises -- Session operations observe Effect failures and always resolve.
    void create({ name: name.trim() || DEFAULT_NAME, assembly });
  };

  return (
    <FormCard id={id} label="New session" onSubmit={submit} onCancel={onClose}>
      <TextField
        label="Session name"
        placeholder={DEFAULT_NAME}
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="small"
        fullWidth
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The form opens, from the user's click, to name the session.
        autoFocus
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }}
      />
      <TextField
        select
        label="Assembly"
        value={assembly}
        onChange={(event) => setAssembly(event.target.value)}
        size="small"
        fullWidth
      >
        {supportedAssemblies.map(({ id, label }) => (
          <MenuItem key={id} value={id}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <FormCardActions submitLabel="Create" submitDisabled={disabled} onCancel={onClose} />
    </FormCard>
  );
}
