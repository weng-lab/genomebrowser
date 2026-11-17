"use client";

// TEMPORARY (#368): a stand-in for adding tracks from URLs, so the flow can be tried, until the
// design for adding tracks beside personal collections settles. Replace it rather than extend it.

import Close from "@mui/icons-material/Close";
import PlaylistAdd from "@mui/icons-material/PlaylistAdd";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { parseCustomTracks, sortByPriority, type LineError } from "../customTracks";
import { addTracksFromUrls, typeFromUrl, type TrackRequest } from "../urlTracks";
import {
  bigBedPresetSchema,
  trackVisibilitySchema,
  urlTrackTypeSchema,
  type BigBedPreset,
  type TrackVisibility,
  type UrlTrackType,
} from "../urlTrackTypes";

/** Opens the Add tracks dialog. */
export function AddTracksButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="small" startIcon={<PlaylistAdd />} onClick={onClick}>
      Add tracks
    </Button>
  );
}

type AddTracksDialogProps = { trackStore: TrackStoreInstance; open: boolean; onClose: () => void };

/**
 * Adds tracks from pasted file URLs and UCSC track lines. Pasting reads the text into one row
 * per track without fetching anything; adding checks every file and adds all the rows or none,
 * showing each failure on its row.
 */
export function AddTracksDialog({ trackStore, open, onClose }: AddTracksDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      {/* The dialog unmounts its content once closed, so each opening starts empty. */}
      <AddTracksForm trackStore={trackStore} onClose={onClose} />
    </Dialog>
  );
}

type Row = { key: string; request: TrackRequest; failure?: string };

const hexColor = /^#[0-9a-f]{6}$/i;

function AddTracksForm({ trackStore, onClose }: Omit<AddTracksDialogProps, "open">) {
  const [text, setText] = useState("");
  const [lineErrors, setLineErrors] = useState<LineError[]>([]);
  // Undefined while pasting; the rows to add once the text is reviewed.
  const [rows, setRows] = useState<Row[]>();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef<AbortController>(undefined);
  // Closing the dialog while files are checked stops the add, so nothing is added.
  useEffect(() => () => pending.current?.abort(), []);

  function review() {
    const { tracks, errors } = parseCustomTracks(text);
    setLineErrors(errors);
    setError(undefined);
    if (errors.length > 0) return;
    if (tracks.length === 0) {
      setError("Paste at least one file URL or track line.");
      return;
    }
    setRows(sortByPriority(tracks).map(({ request }) => ({ key: crypto.randomUUID(), request })));
  }

  // Editing a row clears its failure, since the next add checks it again.
  const change = (key: string, update: Partial<TrackRequest>) =>
    setRows((current) =>
      current?.map((row) =>
        row.key === key ? { key, request: { ...row.request, ...update } } : row,
      ),
    );
  const remove = (key: string) => setRows((current) => current?.filter((row) => row.key !== key));
  const removeFailed = () => setRows((current) => current?.filter((row) => !row.failure));

  async function add(toAdd: Row[]) {
    const badColor = toAdd.some(({ request }) => request.color && !hexColor.test(request.color));
    if (badColor) {
      setRows(
        toAdd.map((row) =>
          row.request.color && !hexColor.test(row.request.color)
            ? { ...row, failure: "Enter the color as #RRGGBB, such as #3366cc, or leave it empty." }
            : row,
        ),
      );
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setAdding(true);
    setError(undefined);
    try {
      const outcome = await addTracksFromUrls(
        trackStore,
        toAdd.map(({ request }) => request),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (outcome.ok) onClose();
      else if (outcome.failures) {
        const reasons = new Map(outcome.failures.map((f) => [f.index, `${f.code}: ${f.error}`]));
        setRows(toAdd.map((row, index) => ({ ...row, failure: reasons.get(index) })));
      } else setError(outcome.error);
    } catch (caught) {
      setError(`The tracks could not be added: ${String(caught)}`);
    } finally {
      pending.current = undefined;
      setAdding(false);
    }
  }

  const failed = rows?.filter((row) => row.failure).length ?? 0;
  return (
    <>
      <DialogTitle>Add tracks</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, "&&": { pt: 1 } }}>
        {rows === undefined ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Paste hosted file URLs or UCSC track lines, one per line. BigWig, BigBed, BigGenePred,
              and BAM files can be added; you can review each track before adding.
            </Typography>
            <TextField
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- The dialog opens to paste.
              autoFocus
              multiline
              minRows={6}
              label="URLs or track lines"
              value={text}
              onChange={(event) => setText(event.target.value)}
              slotProps={{
                htmlInput: { spellCheck: false, sx: { fontFamily: "monospace", fontSize: 13 } },
              }}
            />
            {lineErrors.length > 0 && (
              <Box component="ul" aria-label="Lines that can't be added" sx={{ m: 0, pl: 3 }}>
                {lineErrors.map(({ line, message }) => (
                  <Typography key={line} component="li" variant="body2" color="error">
                    Line {line}: {message}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        ) : (
          <Box
            component="ol"
            aria-label="Tracks to add"
            sx={{ m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {rows.map((row, index) => (
              <RequestRow
                key={row.key}
                index={index}
                row={row}
                disabled={adding}
                onChange={(update) => change(row.key, update)}
                onRemove={() => remove(row.key)}
              />
            ))}
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {rows !== undefined && (
          <Button onClick={() => setRows(undefined)} disabled={adding} sx={{ mr: "auto" }}>
            Back to text
          </Button>
        )}
        {failed > 0 && (
          <Button onClick={removeFailed} disabled={adding}>
            Remove {failed} failed {failed === 1 ? "row" : "rows"}
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        {rows === undefined ? (
          <Button variant="contained" onClick={review} disabled={text.trim() === ""}>
            Review
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => void add(rows)}
            disabled={adding || rows.length === 0}
          >
            {adding
              ? "Checking files…"
              : `Add ${rows.length} ${rows.length === 1 ? "track" : "tracks"}`}
          </Button>
        )}
      </DialogActions>
    </>
  );
}

const typeLabels: Record<UrlTrackType, string> = {
  bigwig: "BigWig",
  bigbed: "BigBed",
  gene: "Gene (BigGenePred)",
  "ccre-bigbed": "cCRE (BigBed)",
  bam: "BAM",
};

type RequestRowProps = {
  index: number;
  row: Row;
  disabled: boolean;
  onChange: (update: Partial<TrackRequest>) => void;
  onRemove: () => void;
};

/** Every choice a request can make, for one track. Empty fields leave the choice to the file. */
function RequestRow({
  index,
  row: { request, failure },
  disabled,
  onChange,
  onRemove,
}: RequestRowProps) {
  const inferred = typeFromUrl(request.url);
  const type = request.type ?? inferred;
  const name = request.title || request.url;
  // Empty text means no choice, so the file or the type decides.
  const text = (value: string) => value.trim() || undefined;
  return (
    <Box
      component="li"
      aria-label={`Track ${index + 1}`}
      sx={{
        listStyle: "none",
        border: 1,
        borderColor: failure ? "error.main" : "divider",
        borderRadius: 1,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(0, 1fr))" },
            gap: 1.5,
          }}
        >
          <Field span={4}>
            <TextField
              size="small"
              label="URL"
              value={request.url}
              disabled={disabled}
              onChange={(event) => onChange({ url: event.target.value.trim() })}
            />
          </Field>
          <Field span={2}>
            <TextField
              size="small"
              label="Title"
              placeholder="The file name"
              value={request.title ?? ""}
              disabled={disabled}
              onChange={(event) => onChange({ title: event.target.value || undefined })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Field>
          <Choice
            label="Type"
            value={request.type}
            disabled={disabled}
            empty={inferred ? `From the URL: ${typeLabels[inferred]}` : "Choose a type"}
            options={urlTrackTypeSchema.options.map((value) => [value, typeLabels[value]])}
            onChange={(value) => onChange({ type: value })}
          />
          <Choice<TrackVisibility>
            label="Visibility"
            value={request.visibility}
            disabled={disabled}
            empty="The type's default"
            options={trackVisibilitySchema.options.map((value) => [value, value])}
            onChange={(value) => onChange({ visibility: value })}
          />
          <Field span={1}>
            <TextField
              size="small"
              label="Color"
              placeholder="The type's default"
              value={request.color ?? ""}
              disabled={disabled}
              onChange={(event) => onChange({ color: text(event.target.value) })}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <input
                      type="color"
                      aria-label={`Pick a color for ${name}`}
                      disabled={disabled}
                      value={
                        request.color && hexColor.test(request.color) ? request.color : "#000000"
                      }
                      onChange={(event) => onChange({ color: event.target.value })}
                      style={{ width: 24, height: 24, padding: 0, border: 0, marginRight: 8 }}
                    />
                  ),
                },
              }}
            />
          </Field>
          {type === "bigbed" && (
            <Choice<BigBedPreset>
              label="BED columns"
              value={request.bedSchema}
              disabled={disabled}
              empty="From the file's header"
              options={bigBedPresetSchema.options.map((value) => [value, value])}
              onChange={(value) => onChange({ bedSchema: value })}
            />
          )}
          {type === "bam" && (
            <Field span={2}>
              <TextField
                size="small"
                label="BAI index URL"
                placeholder="The BAM URL with .bai added"
                value={request.indexUrl ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ indexUrl: text(event.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Field>
          )}
        </Box>
        <IconButton
          aria-label={`Remove ${name}`}
          size="small"
          onClick={onRemove}
          disabled={disabled}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>
      {request.metadata && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }} aria-label="Metadata">
          {Object.entries(request.metadata).map(([field, value]) => (
            <Chip key={field} size="small" label={`${field}: ${String(value)}`} />
          ))}
        </Box>
      )}
      {failure && (
        <Typography variant="body2" color="error">
          {failure}
        </Typography>
      )}
    </Box>
  );
}

/** A grid cell spanning `span` of a row's four columns on wider screens. */
function Field({ span, children }: { span: number; children: ReactNode }) {
  return <Box sx={{ gridColumn: { sm: `span ${span}` }, display: "grid" }}>{children}</Box>;
}

type ChoiceProps<Value extends string> = {
  label: string;
  value: Value | undefined;
  disabled: boolean;
  /** The label of the empty choice, which leaves the decision to the file or the type. */
  empty: string;
  options: [value: Value, label: string][];
  onChange: (value: Value | undefined) => void;
};

/** A native select, which keeps the dense rows compact. */
function Choice<Value extends string>({
  label,
  value,
  disabled,
  empty,
  options,
  onChange,
}: ChoiceProps<Value>) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange((event.target.value || undefined) as Value | undefined)}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
    >
      <option value="">{empty}</option>
      {options.map(([option, optionLabel]) => (
        <option key={option} value={option}>
          {optionLabel}
        </option>
      ))}
    </TextField>
  );
}
