"use client";

import Add from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import type { BrowserStoreInstance, GenomicRegion } from "@weng-lab/genomebrowser";
import { useRef, useState } from "react";
import { FormCard, FormCardActions, formButtonSx } from "../../../../shared/ui/FormCard";
import { CoordinateFields, isOpen, useCoordinates } from "./CoordinateFields";

type AddRegionFormProps = {
  id: string;
  browserStore: BrowserStoreInstance;
  /** The name the region takes when the field is left blank. */
  defaultName: string;
  /** Saves `region` as a region named `name`, which may be blank. */
  onAdd: (name: string, region: GenomicRegion) => void;
  onCancel: () => void;
};

/**
 * The Regions section's form for a new region: its name, then saving the current view, or
 * coordinates on the shown chromosome, which start as the view's.
 */
export function AddRegionForm({
  id,
  browserStore,
  defaultName,
  onAdd,
  onCancel,
}: AddRegionFormProps) {
  const [name, setName] = useState("");
  // While open, the form submits the typed coordinates instead of the view.
  const coordinates = useCoordinates();
  const refocus = useRef(false);

  const submit = () => {
    const { region, assembly } = browserStore.getState();
    if (!isOpen(coordinates)) return onAdd(name, region);
    const typed = coordinates.read(assembly);
    if (typed) onAdd(name, typed);
  };
  const closeCoordinates = () => {
    refocus.current = true;
    coordinates.close();
  };

  return (
    <FormCard id={id} label="Add region" onSubmit={submit} onCancel={onCancel}>
      <TextField
        label="Region name"
        placeholder={defaultName}
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="small"
        fullWidth
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The form opens, from the user's click, to name the region.
        autoFocus
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {isOpen(coordinates) ? (
        <CoordinateFields coordinates={coordinates} onCancel={closeCoordinates} />
      ) : (
        <>
          <Button
            ref={(button) => {
              // Back from the coordinates, focus returns to what opened them.
              if (button && refocus.current) {
                refocus.current = false;
                button.focus();
              }
            }}
            size="small"
            startIcon={<Add />}
            onClick={() => coordinates.open(browserStore.getState().region)}
            sx={{ ...formButtonSx, alignSelf: "flex-start" }}
          >
            Add by coordinates
          </Button>
          <FormCardActions submitLabel="Add current region" onCancel={onCancel} />
        </>
      )}
    </FormCard>
  );
}
