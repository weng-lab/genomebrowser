"use client";

// TEMPORARY PLACEMENT (#368): adding tracks from URLs lives in this dialog until the collections
// design settles. The review flow is expected to move into that design, so keep it independent of
// the dialog and of the session, which it reaches only through `addTracksFromUrls` in `add`.

import Close from "@mui/icons-material/Close";
import UploadFile from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  TrackMetadataEditor,
  metadataFromRows,
  metadataRows,
  type TrackMetadataRow,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isHexColor } from "../../../shared/ui/color";
import { parseCustomTracks, sortByPriority, type LineError } from "../customTracks";
import {
  addTracksFromUrls,
  defaultColor,
  headerBedPreset,
  titleFromUrl,
  typeFromUrl,
  type TrackRequest,
} from "../urlTracks";
import {
  bigBedPresetSchema,
  trackVisibilitySchema,
  urlTrackTypeSchema,
  type BigBedPreset,
  type TrackVisibility,
  type UrlTrackType,
} from "../urlTrackTypes";

type AddTracksDialogProps = { trackStore: TrackStoreInstance; open: boolean; onClose: () => void };

/**
 * Adds tracks from pasted or uploaded file URLs and UCSC track lines. Reviewing reads the text
 * into one row per track, which can be edited; adding checks every file and adds all the rows or
 * none, showing each failure on its row.
 */
export function AddTracksDialog({ trackStore, open, onClose }: AddTracksDialogProps) {
  // The add in progress. Every way of closing stops it at once, since the content stays mounted
  // while the dialog fades out, and an add that ended then would still add its tracks.
  const pending = useRef<AbortController>(undefined);
  const close = () => {
    pending.current?.abort();
    onClose();
  };
  // Leaving the session while files are checked stops the add too, as does closing
  // the dialog from outside, such as when the agent takes control.
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!open) pending.current?.abort();
  }, [open]);
  const startAdd = () => {
    pending.current = new AbortController();
    return pending.current.signal;
  };
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      {/* The dialog unmounts its content once closed, so each opening starts empty. */}
      <AddTracksForm trackStore={trackStore} startAdd={startAdd} onClose={close} />
    </Dialog>
  );
}

type RowRequest = Omit<TrackRequest, "metadata">;
type Row = {
  key: string;
  request: RowRequest;
  /** The metadata being edited, as the settings dialog's editor edits it. */
  fields: TrackMetadataRow[];
  /** The title was filled in from the file name and hasn't been edited, so it follows the URL. */
  titleFromFile: boolean;
  failure?: string;
};

// Empty text means no choice, so the file or the type decides.
const optionalText = (value: string) => value.trim() || undefined;
// Far more than the URLs and track lines of a session's most tracks.
const maxUploadBytes = 1_000_000;

type AddTracksFormProps = {
  trackStore: TrackStoreInstance;
  /** Starts an add, returning the signal that closing the dialog aborts. */
  startAdd: () => AbortSignal;
  onClose: () => void;
};

function AddTracksForm({ trackStore, startAdd, onClose }: AddTracksFormProps) {
  const [text, setText] = useState("");
  const [lineErrors, setLineErrors] = useState<LineError[]>([]);
  // Undefined while pasting; the rows to add once the text is reviewed.
  const [rows, setRows] = useState<Row[]>();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  function review(content: string) {
    const { tracks, errors } = parseCustomTracks(content);
    setLineErrors(errors);
    setError(undefined);
    if (errors.length > 0) return;
    if (tracks.length === 0) {
      setError("Paste at least one file URL or track line.");
      return;
    }
    setRows(
      sortByPriority(tracks).map(({ request: { metadata, ...request } }) => ({
        key: crypto.randomUUID(),
        // Show the title the track gets from its file name, ready to edit.
        request: { ...request, title: request.title ?? titleFromUrl(request.url) },
        fields: metadataRows(metadata),
        titleFromFile: request.title === undefined,
      })),
    );
  }

  // Reads the chosen file as if its text were pasted, then reviews it.
  async function upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    // Choosing the same file again, after editing it, reads it again.
    input.value = "";
    if (!file) return;
    if (file.size > maxUploadBytes) {
      setLineErrors([]);
      setError(
        `${file.name} is larger than 1 MB. Upload a file of URLs or track lines, not the track data itself.`,
      );
      return;
    }
    let content: string;
    try {
      content = await file.text();
    } catch {
      setLineErrors([]);
      setError(`${file.name} could not be read. Choose the file again, or paste its text.`);
      return;
    }
    setText(content);
    review(content);
  }

  // Editing a row clears its failure, since the next add checks it again.
  const edit = (key: string, edited: (row: Row) => Partial<Row>) =>
    setRows((current) =>
      current?.map((row) =>
        row.key === key ? { ...row, ...edited(row), failure: undefined } : row,
      ),
    );
  const remove = (key: string) => setRows((current) => current?.filter((row) => row.key !== key));
  const removeFailed = () => setRows((current) => current?.filter((row) => !row.failure));

  async function add(toAdd: Row[]) {
    const requests: TrackRequest[] = [];
    const problems = new Map<number, string>();
    for (const [index, row] of toAdd.entries()) {
      const request = rowRequest(row);
      if (typeof request === "string") problems.set(index, request);
      else requests.push(request);
    }
    if (problems.size > 0) {
      setRows(
        toAdd.map((row, index) =>
          problems.has(index) ? { ...row, failure: problems.get(index) } : row,
        ),
      );
      return;
    }
    const signal = startAdd();
    setAdding(true);
    setError(undefined);
    try {
      const outcome = await addTracksFromUrls(trackStore, requests, signal);
      if (signal.aborted) return;
      if (outcome.ok) onClose();
      else if (outcome.failures) {
        const reasons = new Map(outcome.failures.map((f) => [f.index, `${f.code}: ${f.error}`]));
        setRows(toAdd.map((row, index) => ({ ...row, failure: reasons.get(index) })));
      } else setError(outcome.error);
    } catch (caught) {
      setError(`The tracks could not be added: ${String(caught)}`);
    } finally {
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
              Paste hosted file URLs or UCSC track lines, one per line, or upload a .txt or .csv
              file of them. BigWig, BigBed, BigGenePred, and BAM files can be added; you can review
              each track before adding.
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
            <input
              ref={fileInput}
              type="file"
              hidden
              aria-label="File of URLs or track lines"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={(event) => void upload(event.target)}
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
                onChange={(update) => edit(row.key, (current) => updated(current, update))}
                onFieldsChange={(fields) => edit(row.key, () => ({ fields }))}
                onRemove={() => remove(row.key)}
              />
            ))}
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {rows === undefined ? (
          <Button
            startIcon={<UploadFile />}
            onClick={() => fileInput.current?.click()}
            sx={{ mr: "auto" }}
          >
            Upload a file
          </Button>
        ) : (
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
          <Button variant="contained" onClick={() => review(text)} disabled={text.trim() === ""}>
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

/** A row's request with an update applied. A title filled in from the file follows a new URL. */
function updated(
  { request, titleFromFile }: Row,
  update: Partial<RowRequest>,
): Pick<Row, "request" | "titleFromFile"> {
  // Editing the title, even clearing it, makes it the row's own.
  if ("title" in update) return { request: { ...request, ...update }, titleFromFile: false };
  const next = { ...request, ...update };
  if (titleFromFile && update.url !== undefined) next.title = titleFromUrl(update.url);
  return { request: next, titleFromFile };
}

/** The row as a request, or why it can't be added before its files are checked. */
function rowRequest({ request, fields }: Row): TrackRequest | string {
  const result = metadataFromRows(fields);
  // The editor already says under each field what's wrong with it.
  if (!result.ok) return "Finish or fix the metadata fields above.";
  const { metadata } = result;
  return Object.keys(metadata).length > 0 ? { ...request, metadata } : request;
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
  onChange: (update: Partial<RowRequest>) => void;
  onFieldsChange: (fields: TrackMetadataRow[]) => void;
  onRemove: () => void;
};

/** Every choice a request can make, for one track. Empty fields leave the choice to the file. */
function RequestRow({
  index,
  row: { request, fields, failure },
  disabled,
  onChange,
  onFieldsChange,
  onRemove,
}: RequestRowProps) {
  const inferred = typeFromUrl(request.url);
  const type = request.type ?? inferred;
  const header = useHeaderPreset(request.url, type === "bigbed");
  const preset = request.bedSchema ?? (header === "reading" ? undefined : header);
  const name = request.title || request.url;
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
            alignItems: "start",
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
              placeholder={titleFromUrl(request.url) ?? "The file name"}
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
          <Field span={2}>
            <ColorField
              trackName={name}
              color={request.color}
              fallback={type && defaultColor(type)}
              effect={colorEffect(type, preset)}
              disabled={disabled}
              onChange={(color) => onChange({ color })}
            />
          </Field>
          {type === "bigbed" && (
            <Field span={2}>
              <Choice<BigBedPreset>
                label="BED columns"
                value={request.bedSchema}
                disabled={disabled}
                empty={headerChoice(header)}
                options={bigBedPresetSchema.options.map((value) => [value, value])}
                onChange={(value) => onChange({ bedSchema: value })}
              />
            </Field>
          )}
          {type === "bam" && (
            <Field span={2}>
              <TextField
                size="small"
                label="BAI index URL"
                placeholder="The BAM URL with .bai added"
                value={request.indexUrl ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ indexUrl: optionalText(event.target.value) })}
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
      <TrackMetadataEditor value={fields} disabled={disabled} onChange={onFieldsChange} />
      {failure && (
        <Typography variant="body2" color="error">
          {failure}
        </Typography>
      )}
    </Box>
  );
}

type ColorFieldProps = {
  trackName: string;
  color: string | undefined;
  /** The type's color, which an empty field leaves the track. */
  fallback: string | undefined;
  /** What the color changes on this track. */
  effect: string | undefined;
  disabled: boolean;
  onChange: (color: string | undefined) => void;
};

/** A track's color, typed as `#RRGGBB` or picked. */
function ColorField({ trackName, color, fallback, effect, disabled, onChange }: ColorFieldProps) {
  const picked = color && isHexColor(color) ? color : (fallback ?? "#000000");
  return (
    <TextField
      size="small"
      label="Color"
      placeholder={fallback ? `${fallback}, the type's default` : "#RRGGBB"}
      value={color ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(optionalText(event.target.value))}
      helperText={effect}
      slotProps={{
        inputLabel: { shrink: true },
        input: {
          startAdornment: (
            <input
              type="color"
              aria-label={`Pick a color for ${trackName}`}
              disabled={disabled}
              value={picked}
              onChange={(event) => onChange(event.target.value)}
              style={{ width: 24, height: 24, padding: 0, border: 0, marginRight: 8 }}
            />
          ),
        },
      }}
    />
  );
}

/**
 * The BED columns a BigBed file's header chooses, read from the file while `enabled`: "reading"
 * until the read ends, then undefined when the file can't be read. Waits for typing in the URL
 * field to pause, and drops a read once the URL changes.
 */
function useHeaderPreset(url: string, enabled: boolean): BigBedPreset | "reading" | undefined {
  const [read, setRead] = useState<{ url: string; preset?: BigBedPreset }>();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      headerBedPreset(url, controller.signal).then(
        (preset) => setRead({ url, preset }),
        () => {
          if (!controller.signal.aborted) setRead({ url });
        },
      );
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, enabled]);
  if (!enabled) return undefined;
  return read?.url === url ? read.preset : "reading";
}

function headerChoice(header: BigBedPreset | "reading" | undefined) {
  if (header === "reading") return "Reading the file's header…";
  return header ? `From the file's header: ${header}` : "From the file's header";
}

const marginOnly = "so this colors only the strip at the track's left edge";

/** What a track's color changes, for its type and, for BigBed, the columns it reads. */
function colorEffect(type: UrlTrackType | undefined, preset: BigBedPreset | undefined) {
  switch (type) {
    case "bigwig":
      return "Colors the signal.";
    case "gene":
      return "Colors genes and transcripts. MANE Select transcripts keep their own color.";
    case "ccre-bigbed":
      return `cCREs keep their class colors, ${marginOnly}.`;
    case "bam":
      return `Reads keep their strand colors, ${marginOnly}.`;
    case "bigbed":
      if (preset === "bed9")
        return `Features keep the file's colors (itemRgb), ${marginOnly}. Choose bed6 columns to color them with it.`;
      if (preset) return "Colors every feature.";
      return "Colors every feature, unless the file has its own colors (bed9).";
    default:
      return undefined;
  }
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
