"use client";

// Temporary: experimental whole-browser export for issue #322. Remove or replace with the
// toolbar design once the experiment is evaluated.
import { useBrowserDownload, type BrowserStoreInstance } from "@weng-lab/genomebrowser";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";

export function TempBrowserImageDownload({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const { download, isDownloading, error } = useBrowserDownload(browserStore);
  const [timing, setTiming] = useState<string | null>(null);

  const run = async (format: "svg" | "png", scale?: number) => {
    setTiming(null);
    const started = performance.now();
    const ok = await download(format, { scale });
    if (ok) {
      const label = scale ? `${format.toUpperCase()} ${scale}×` : format.toUpperCase();
      setTiming(`${label} prepared in ${Math.round(performance.now() - started)} ms`);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Button
        size="small"
        variant="outlined"
        disabled={isDownloading}
        onClick={() => void run("svg")}
      >
        Browser SVG (temp)
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={isDownloading}
        onClick={() => void run("png")}
      >
        Browser PNG (temp)
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={isDownloading}
        onClick={() => void run("png", 2)}
      >
        Browser PNG 2× (temp)
      </Button>
      {isDownloading && (
        <Typography variant="caption" color="text.secondary">
          Preparing…
        </Typography>
      )}
      {timing && !isDownloading && (
        <Typography variant="caption" color="text.secondary">
          {timing}
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error" role="alert">
          {error}
        </Typography>
      )}
    </Box>
  );
}
