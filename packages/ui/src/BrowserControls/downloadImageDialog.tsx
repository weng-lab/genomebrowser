import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import {
  useBrowserDownload,
  type BrowserStoreInstance,
  type TrackImageFormat,
} from "@weng-lab/genomebrowser";

export type DownloadImageDialogProps = {
  browserStore: BrowserStoreInstance;
  open: boolean;
  onClose: () => void;
};

const formats: { value: TrackImageFormat; label: string; description: string }[] = [
  { value: "svg", label: "SVG", description: "Vector image for publications and editing" },
  { value: "png", label: "PNG", description: "Raster image for slides and documents" },
];

type ImageContents = { includeTitles: boolean; includeRuler: boolean };

const contentOptions: { key: keyof ImageContents; label: string; description: string }[] = [
  { key: "includeTitles", label: "Track titles", description: "Name above each track" },
  { key: "includeRuler", label: "Ruler", description: "Coordinate ruler tracks" },
];

const scales = [
  { value: 1, label: "1×", description: "Screen" },
  { value: 2, label: "2×", description: "High resolution" },
  { value: 3, label: "3×", description: "Print" },
];

/** Choose a format and resolution, then download every track of the browser as one image. */
export function DownloadImageDialog({ browserStore, open, onClose }: DownloadImageDialogProps) {
  // Choices outlive the dialog content so reopening keeps them.
  const [format, setFormat] = useState<TrackImageFormat>("svg");
  const [scale, setScale] = useState(2);
  const [contents, setContents] = useState<ImageContents>({
    includeTitles: true,
    includeRuler: true,
  });

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      onClose={onClose}
      aria-labelledby="genomebrowser-download-image-title"
      slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
    >
      <DialogTitle
        id="genomebrowser-download-image-title"
        sx={{
          alignItems: "center",
          bgcolor: "primary.dark",
          color: "primary.contrastText",
          display: "flex",
          fontWeight: 700,
          justifyContent: "space-between",
          py: 1.25,
          pr: 1,
        }}
      >
        Download image
        <IconButton
          aria-label="Close download image"
          onClick={onClose}
          sx={{ color: "primary.contrastText" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DownloadImageContent
        browserStore={browserStore}
        open={open}
        format={format}
        scale={scale}
        contents={contents}
        onFormatChange={setFormat}
        onScaleChange={setScale}
        onContentsChange={setContents}
        onClose={onClose}
      />
    </Dialog>
  );
}

// Unmounted after the dialog closes, which cancels a pending PNG.
function DownloadImageContent({
  browserStore,
  open,
  format,
  scale,
  contents,
  onFormatChange,
  onScaleChange,
  onContentsChange,
  onClose,
}: {
  browserStore: BrowserStoreInstance;
  open: boolean;
  format: TrackImageFormat;
  scale: number;
  contents: ImageContents;
  onFormatChange: (format: TrackImageFormat) => void;
  onScaleChange: (scale: number) => void;
  onContentsChange: (contents: ImageContents) => void;
  onClose: () => void;
}) {
  const useBrowserStore = browserStore;
  const isLoading = useBrowserStore((state) => state.isLoading);
  const { download, isDownloading, error, defaultFilename } = useBrowserDownload(browserStore);
  // A typed name belongs to one export, so it resets when the dialog reopens.
  const [filename, setFilename] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  // Content stays mounted while the dialog animates closed, so track whether it is open.
  const isOpen = useRef(open);
  const isBusy = isStarting || isDownloading;

  useEffect(() => {
    isOpen.current = open;
    return () => {
      isOpen.current = false;
    };
  }, [open]);

  const handleDownload = async () => {
    setIsStarting(true);
    // Capturing a large browser blocks the page, so show progress before it starts.
    await nextPaint();
    if (!isOpen.current) return;
    const options = { ...contents, filename };
    // The guard below checks whether the dialog closed during the download.
    // react-doctor-disable-next-line react-doctor/async-defer-await
    const downloaded = await download(format, format === "png" ? { ...options, scale } : options);
    if (!isOpen.current) return;
    setIsStarting(false);
    if (downloaded) onClose();
  };

  return (
    <>
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Includes every track and highlight in the current region.
          </Typography>
          <TextField
            label="File name"
            size="small"
            fullWidth
            disabled={isBusy}
            value={filename}
            placeholder={defaultFilename}
            onChange={(event) => setFilename(event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: <InputAdornment position="end">.{format}</InputAdornment>,
              },
            }}
          />
          <FormControl disabled={isBusy}>
            <FormLabel id="genomebrowser-download-format">Format</FormLabel>
            <RadioGroup
              aria-labelledby="genomebrowser-download-format"
              value={format}
              onChange={(event) => onFormatChange(event.target.value as TrackImageFormat)}
            >
              {formats.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" />}
                  label={<OptionLabel label={option.label} description={option.description} />}
                />
              ))}
            </RadioGroup>
          </FormControl>
          {format === "png" && (
            <FormControl disabled={isBusy}>
              <FormLabel id="genomebrowser-download-resolution">Resolution</FormLabel>
              <RadioGroup
                row
                aria-labelledby="genomebrowser-download-resolution"
                value={scale}
                onChange={(event) => onScaleChange(Number(event.target.value))}
              >
                {scales.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size="small" />}
                    label={<OptionLabel label={option.label} description={option.description} />}
                  />
                ))}
              </RadioGroup>
              <Typography variant="caption" color="text.secondary">
                Very tall browsers may exceed PNG size limits. Choose SVG for those.
              </Typography>
            </FormControl>
          )}
          <FormControl component="fieldset" disabled={isBusy}>
            <FormLabel component="legend">Include</FormLabel>
            <FormGroup>
              {contentOptions.map((option) => (
                <FormControlLabel
                  key={option.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={contents[option.key]}
                      onChange={(event) =>
                        onContentsChange({ ...contents, [option.key]: event.target.checked })
                      }
                    />
                  }
                  label={<OptionLabel label={option.label} description={option.description} />}
                />
              ))}
            </FormGroup>
          </FormControl>
          {isLoading && !isBusy && (
            <Typography variant="caption" color="text.secondary">
              Waiting for tracks to finish loading…
            </Typography>
          )}
          {isBusy && (
            <Stack component="output" spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Preparing image…
              </Typography>
              <LinearProgress aria-label="Preparing image" />
            </Stack>
          )}
          {error && !isBusy && (
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={isBusy || isLoading}
          onClick={() => void handleDownload()}
        >
          Download {format.toUpperCase()}
        </Button>
      </DialogActions>
    </>
  );
}

function OptionLabel({ label, description }: { label: string; description: string }) {
  return (
    <Typography variant="body2" component="span">
      {label}{" "}
      <Typography variant="caption" component="span" color="text.secondary">
        {description}
      </Typography>
    </Typography>
  );
}

// Resolve after the browser has painted pending updates.
function nextPaint() {
  return new Promise<void>((resolve) => {
    const next = () => setTimeout(resolve, 0);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(next);
    else next();
  });
}
