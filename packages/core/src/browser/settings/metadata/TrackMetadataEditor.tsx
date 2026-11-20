import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  metadataFromRows,
  newMetadataRow,
  type TrackMetadataRow,
  type TrackMetadataRowProblem,
  type TrackMetadataValueType,
} from "./metadataRows";

export type TrackMetadataEditorProps = {
  /** The fields being edited. Turn them into metadata with `metadataFromRows`. */
  value: readonly TrackMetadataRow[];
  onChange: (rows: TrackMetadataRow[]) => void;
  disabled?: boolean;
};

const typeLabels: Record<Exclude<TrackMetadataValueType, "none">, string> = {
  text: "Text",
  number: "Number",
  boolean: "True or false",
};

/**
 * Edits a track's metadata as name and value rows. Each field holds text, a number, or true
 * or false; a stored `null` shows as "No value" and stays until the field is changed. Shows
 * under each row what keeps it from being stored.
 */
export function TrackMetadataEditor({ value, onChange, disabled }: TrackMetadataEditorProps) {
  // The row added last gets focus, so its name can be typed straight away.
  const [addedKey, setAddedKey] = useState<string>();
  const result = metadataFromRows(value);
  const problems = new Map(
    result.ok ? [] : result.problems.map((problem) => [problem.key, problem]),
  );

  const change = (key: string, update: Partial<TrackMetadataRow>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...update } : row)));
  const add = () => {
    const row = newMetadataRow();
    setAddedKey(row.key);
    onChange([...value, row]);
  };

  return (
    <Box
      component="fieldset"
      aria-label="Metadata"
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        m: 0,
        minWidth: 0,
        px: 1.25,
        pb: 1.25,
      }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ px: 0.5 }}>
        Metadata
      </Typography>
      <Stack spacing={1.5}>
        {value.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No fields yet. Add one to describe, tag, or sort this track.
          </Typography>
        ) : null}
        {value.map((row, index) => (
          <MetadataRow
            key={row.key}
            label={`Field ${index + 1}`}
            row={row}
            problem={problems.get(row.key)}
            focusName={row.key === addedKey}
            disabled={disabled}
            onChange={(update) => change(row.key, update)}
            onRemove={() => onChange(value.filter(({ key }) => key !== row.key))}
          />
        ))}
        <Box>
          <Button size="small" variant="outlined" disabled={disabled} onClick={add}>
            Add field
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function MetadataRow({
  label,
  row,
  problem,
  focusName,
  disabled,
  onChange,
  onRemove,
}: {
  label: string;
  row: TrackMetadataRow;
  problem: TrackMetadataRowProblem | undefined;
  focusName: boolean;
  disabled?: boolean;
  onChange: (update: Partial<TrackMetadataRow>) => void;
  onRemove: () => void;
}) {
  const messageId = useId();
  // Screen readers read the row's message with its name and value.
  const describedBy = problem ? messageId : undefined;
  return (
    <Box component="fieldset" aria-label={label} sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "flex-start" }}>
        <TextField
          size="small"
          label="Name"
          value={row.name}
          disabled={disabled}
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- A field just added is typed into next.
          autoFocus={focusName}
          onChange={(event) => onChange({ name: event.target.value })}
          slotProps={{ htmlInput: { "aria-describedby": describedBy } }}
          sx={{ flex: "1 1 8rem" }}
        />
        <TextField
          select
          size="small"
          label="Type"
          value={row.type}
          disabled={disabled}
          onChange={(event) => onChange({ type: event.target.value as TrackMetadataValueType })}
          sx={{ flex: "0 0 9rem" }}
        >
          {row.type === "none" ? <MenuItem value="none">No value</MenuItem> : null}
          {Object.entries(typeLabels).map(([type, label]) => (
            <MenuItem key={type} value={type}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <ValueField row={row} describedBy={describedBy} disabled={disabled} onChange={onChange} />
        <IconButton
          size="small"
          aria-label={`Remove ${row.name.trim() ? `the field ${row.name}` : "the unnamed field"}`}
          disabled={disabled}
          onClick={onRemove}
          sx={{ mt: 0.5 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      {problem ? (
        // A row that only needs more typing isn't an error yet.
        <FormHelperText id={messageId} error={!problem.incomplete}>
          {problem.message}
        </FormHelperText>
      ) : null}
    </Box>
  );
}

function ValueField({
  row,
  describedBy,
  disabled,
  onChange,
}: {
  row: TrackMetadataRow;
  describedBy: string | undefined;
  disabled?: boolean;
  onChange: (update: Partial<TrackMetadataRow>) => void;
}) {
  const sx = { flex: "2 1 8rem" };
  if (row.type === "boolean") {
    return (
      <TextField
        select
        size="small"
        label="Value"
        value={String(row.checked)}
        disabled={disabled}
        onChange={(event) => onChange({ checked: event.target.value === "true" })}
        sx={sx}
      >
        <MenuItem value="true">True</MenuItem>
        <MenuItem value="false">False</MenuItem>
      </TextField>
    );
  }
  if (row.type === "none") {
    return (
      <TextField
        size="small"
        label="Value"
        value=""
        placeholder="No value"
        disabled
        slotProps={{ inputLabel: { shrink: true } }}
        sx={sx}
      />
    );
  }
  return (
    <TextField
      size="small"
      label="Value"
      value={row.text}
      disabled={disabled}
      onChange={(event) => onChange({ text: event.target.value })}
      slotProps={{
        htmlInput: {
          "aria-describedby": describedBy,
          inputMode: row.type === "number" ? "decimal" : undefined,
        },
      }}
      sx={sx}
    />
  );
}

function CloseIcon({ fontSize }: { fontSize: "small" }) {
  return (
    <SvgIcon fontSize={fontSize}>
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </SvgIcon>
  );
}
