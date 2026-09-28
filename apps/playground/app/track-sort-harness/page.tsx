"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  hg38,
  type AnyTrackInstance,
} from "@weng-lab/genomebrowser";
import { HighlightDialog, ManagementControls, TrackSortDialog } from "@weng-lab/genomebrowser-ui";
import { useState } from "react";
import {
  baseSortOptions,
  createInitialInfo,
  createInitialTracks,
  createSampleTrack,
  detailColumns,
  detailSortOptions,
  harnessModules,
  initialPinnedTrackIds,
  initialRegion,
  nextSampleInfo,
  pinnableTrackId,
  replicateSortOption,
  sampleTrackId,
} from "./sampleTracks";

export default function TrackSortHarness() {
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: hg38,
      region: initialRegion,
      marginWidth: 180,
      trackWidth: 800,
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: harnessModules,
      tracks: createInitialTracks(),
      pinnedTrackIds: initialPinnedTrackIds,
    }),
  );
  const order = useTrackStore((state) => state.order);
  const pinnedTrackIds = useTrackStore((state) => state.pinnedTrackIds);
  const reorderTracks = useTrackStore((state) => state.reorderTracks);
  const setTracks = useTrackStore((state) => state.setTracks);
  const addTrack = useTrackStore((state) => state.addTrack);
  const setPinnedTrackIds = useTrackStore((state) => state.setPinnedTrackIds);

  const [infoById, setInfoById] = useState(createInitialInfo);
  const [addedCount, setAddedCount] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const [orderBeforeSort, setOrderBeforeSort] = useState<readonly string[] | null>(null);
  const [offerReplicate, setOfferReplicate] = useState(false);
  const [manyOptions, setManyOptions] = useState(false);
  const [title, setTitle] = useState("");
  const [closeCount, setCloseCount] = useState(0);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [tracksClicked, setTracksClicked] = useState(false);

  const getMetadata = (track: AnyTrackInstance) => infoById.get(track.base.id);
  const sortOptions = [
    ...baseSortOptions,
    ...(offerReplicate ? [replicateSortOption] : []),
    ...(manyOptions ? detailSortOptions : []),
  ];

  const openSort = () => {
    setOrderBeforeSort(order);
    setSortOpen(true);
  };

  const shuffle = () => {
    const shuffled = [...order];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    reorderTracks(shuffled);
    setOrderBeforeSort(null);
  };

  const reset = () => {
    setTracks(createInitialTracks());
    setPinnedTrackIds(initialPinnedTrackIds);
    setInfoById(createInitialInfo());
    setAddedCount(0);
    setOrderBeforeSort(null);
  };

  const addSampleTrack = () => {
    const info = nextSampleInfo(addedCount);
    addTrack(createSampleTrack(info));
    setInfoById((current) => new Map(current).set(sampleTrackId(info), info));
    setAddedCount(addedCount + 1);
  };

  const pinned = pinnedTrackIds.includes(pinnableTrackId);
  const togglePin = () =>
    setPinnedTrackIds(
      pinned
        ? pinnedTrackIds.filter((id) => id !== pinnableTrackId)
        : [...pinnedTrackIds, pinnableTrackId],
    );

  return (
    <main>
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Box>
          <Typography component="h1" variant="h5">
            Track sort dialog
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sort opens the real TrackSortDialog from genomebrowser-ui. Sample tracks carry sample,
            assay, file type, and replicate metadata. The ruler and Unannotated tracks have none, so
            they should keep their rows. The first sample track is pinned and should stay on top.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <ManagementControls
            onManageHighlights={() => setHighlightsOpen(true)}
            onSelectTracks={() => setTracksClicked(true)}
            onSortTracks={openSort}
          />
          <Button onClick={shuffle}>Shuffle</Button>
          <Button onClick={reset}>Reset</Button>
          <Button onClick={addSampleTrack}>Add sample track</Button>
          <Button onClick={togglePin}>
            {pinned ? "Unpin" : "Pin"} {pinnableTrackId}
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={offerReplicate}
                onChange={(event) => setOfferReplicate(event.target.checked)}
              />
            }
            label="Offer Replicate option"
          />
          <FormControlLabel
            control={
              <Switch
                checked={manyOptions}
                onChange={(event) => setManyOptions(event.target.checked)}
              />
            }
            label={`Many sort options (+${detailSortOptions.length})`}
          />
          <TextField
            size="small"
            label="Dialog title"
            placeholder="Sort Tracks (default)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Keyboard check: Tab to a priority row, press Space to pick it up, move with the arrow
          keys, then press Escape. The move should cancel and the dialog should stay open. A second
          Escape closes it. Dialog closes so far: {closeCount}.
        </Typography>

        <TableContainer sx={{ maxWidth: manyOptions ? "100%" : 900, overflowX: "auto" }}>
          <Table size="small" aria-label="Current track order">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Before sort</TableCell>
                <TableCell>Track ID</TableCell>
                <TableCell>Sample</TableCell>
                <TableCell>Assay</TableCell>
                <TableCell>File type</TableCell>
                <TableCell>Replicate</TableCell>
                <TableCell>Pinned</TableCell>
                {manyOptions &&
                  detailColumns.map(({ field, label }) => (
                    <TableCell key={field}>{label}</TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {order.map((id, index) => {
                const info = infoById.get(id);
                const before = orderBeforeSort?.indexOf(id) ?? -1;
                const moved = before >= 0 && before !== index;
                return (
                  <TableRow key={id} selected={moved}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{before >= 0 ? before + 1 : "—"}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{id}</TableCell>
                    <TableCell>{info?.sampleId ?? "—"}</TableCell>
                    <TableCell>{info?.assay ?? "—"}</TableCell>
                    <TableCell>{info?.fileType ?? "—"}</TableCell>
                    <TableCell>{info?.replicate ?? "—"}</TableCell>
                    <TableCell>
                      {pinnedTrackIds.includes(id) ? <Chip size="small" label="Pinned" /> : null}
                    </TableCell>
                    {manyOptions &&
                      detailColumns.map(({ field }) => (
                        <TableCell key={field} sx={{ whiteSpace: "nowrap" }}>
                          {info?.[field] ?? "—"}
                        </TableCell>
                      ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">
          &quot;Before sort&quot; records positions when Sort is clicked; highlighted rows moved.
        </Typography>

        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </Stack>

      <TrackSortDialog
        trackStore={useTrackStore}
        open={sortOpen}
        onClose={() => {
          setSortOpen(false);
          setCloseCount((count) => count + 1);
        }}
        options={sortOptions}
        getMetadata={getMetadata}
        title={title || undefined}
      />
      <HighlightDialog
        browserStore={useBrowserStore}
        open={highlightsOpen}
        onClose={() => setHighlightsOpen(false)}
      />
      {/* TrackSelect needs collection data and an MUI X Premium license, so Tracks only reports clicks. */}
      <Snackbar
        open={tracksClicked}
        autoHideDuration={3000}
        onClose={() => setTracksClicked(false)}
        message="Tracks clicked. This harness does not render TrackSelect."
      />
    </main>
  );
}
