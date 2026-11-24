"use client";

import Add from "@mui/icons-material/Add";
import CreateNewFolder from "@mui/icons-material/CreateNewFolder";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { alpha, type Theme } from "@mui/material/styles";
import {
  formatDisplayRegion,
  type BrowserStoreInstance,
  type Highlight,
} from "@weng-lab/genomebrowser";
import { useEffect, useId, useRef, useState, type Ref, type RefObject } from "react";
import { useSession } from "../../../sessions/SessionProvider";
import type { RegionGroup } from "../regionGroupSchema";
import { newGroupDefaults, type RegionGroupStoreInstance } from "../regionGroups";
import { ColorDot } from "../../../../shared/ui/ColorDot";
import { EmptyState } from "../../../../shared/ui/EmptyState";
import { formButtonSx } from "../../../../shared/ui/FormCard";
import { SectionHeader } from "../../../../shared/ui/SectionHeader";
import { StatusMessage } from "../../../../shared/ui/StatusMessage";
import {
  nextRegionName,
  positionsOf,
  regionName,
  regionOf,
  sameRegion,
  saveRegion,
  setRegionsColor,
} from "../regions";
import { AddRegionForm } from "./AddRegionForm";
import { ConfirmDialog } from "../../../../shared/ui/ConfirmDialog";
import { NewGroupForm } from "./NewGroupForm";
import { listSx, RegionGroupSection } from "./RegionGroup";
import { RegionActions } from "./RegionMenu";

/**
 * The open session's saved regions: add the current view, go to, edit, hide, group, or
 * delete one, and delete them all. Groups collapse and expand.
 */
export function RegionsPanel() {
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  if (!stores)
    return (
      <Box sx={{ p: 1.5 }}>
        <StatusMessage message="Open a session to save regions." />
      </Box>
    );
  return (
    <Regions
      key={id}
      browserStore={stores.useBrowserStore}
      regionGroupStore={stores.useRegionGroupStore}
    />
  );
}

type StoresProps = {
  browserStore: BrowserStoreInstance;
  regionGroupStore: RegionGroupStoreInstance;
};

/**
 * Each group's members, and the regions in none, in highlight order. Groups keep the order
 * they were made in.
 */
function sectionsOf(highlights: readonly Highlight[], groups: readonly RegionGroup[]) {
  const grouped = new Set(groups.flatMap((group) => group.regionIds));
  return {
    groups: groups.map((group) => {
      const members = new Set(group.regionIds);
      return { group, members: highlights.filter((highlight) => members.has(highlight.id)) };
    }),
    ungrouped: highlights.filter((highlight) => !grouped.has(highlight.id)),
  };
}

/**
 * The form open below the section's heading: a new region, or a new group, which starts with
 * `regionId` when a region's menu opened it. `opener` takes focus back when it closes.
 */
type OpenForm =
  | { kind: "region"; opener: HTMLElement | null }
  | { kind: "group"; regionId?: string; opener: HTMLElement | null };

/** Opens a new group around a region, from that region's actions button. */
type AddToNewGroup = (regionId: string, opener: HTMLElement) => void;

/**
 * Puts focus on the row that takes over from one that leaves its place, which would drop focus
 * with it: a region that moves into or out of a group mounts again elsewhere, and a deleted
 * region, group, or every region unmounts. `focusNext` names, before the change, the regions
 * whose actions buttons may take focus, in order; `actionsRef` records each row's button. When
 * none is shown, such as in a collapsed group, `list` takes focus, or `fallback` once the list
 * is gone.
 */
function useRowFocus(list: RefObject<HTMLElement | null>, fallback: RefObject<HTMLElement | null>) {
  const pending = useRef<readonly string[] | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  // An effect, so it runs after a closing menu or dialog, unmounting, restores focus to what
  // opened it.
  useEffect(() => {
    const regionIds = pending.current;
    if (regionIds === null) return;
    pending.current = null;
    const row = regionIds.map((id) => buttons.current.get(id)).find((button) => button);
    (row ?? list.current ?? fallback.current)?.focus();
  });
  return {
    focusNext: (regionIds: readonly string[]) => {
      pending.current = regionIds;
    },
    actionsRef: (regionId: string) => (button: HTMLButtonElement | null) => {
      if (button) buttons.current.set(regionId, button);
      else buttons.current.delete(regionId);
    },
  };
}

/**
 * The regions that take focus when those in `leaving` go from `order`: the ones after them,
 * then the ones before, nearest first.
 */
function neighbors(order: readonly string[], leaving: readonly string[]) {
  const gone = new Set(leaving);
  const last = order.findLastIndex((id) => gone.has(id));
  if (last === -1) return [];
  const staying = (ids: readonly string[]) => ids.filter((id) => !gone.has(id));
  return [...staying(order.slice(last + 1)), ...staying(order.slice(0, last)).reverse()];
}

function Regions({ browserStore, regionGroupStore }: StoresProps) {
  const useBrowserStore = browserStore;
  const useRegionGroupStore = regionGroupStore;
  const highlights = useBrowserStore((state) => state.highlights);
  const groups = useRegionGroupStore((state) => state.groups);
  const stores = { browserStore, regionGroupStore };
  const [form, setForm] = useState<OpenForm | null>(null);
  const addRegionButton = useRef<HTMLButtonElement>(null);
  const addGroupButton = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const rowFocus = useRowFocus(listRef, addRegionButton);
  // Returns focus to what opened the form, which would otherwise be lost with it.
  const closeForm = () => {
    form?.opener?.focus();
    setForm(null);
  };
  // A header button closes its own form, but replaces one a region's menu opened.
  const toggle = (kind: "region" | "group", opener: HTMLButtonElement | null) =>
    setForm(
      form?.kind === kind && !(form.kind === "group" && form.regionId !== undefined)
        ? null
        : { kind, opener },
    );
  const addToNewGroup: AddToNewGroup = (regionId, opener) =>
    setForm({ kind: "group", regionId, opener });
  const sections = sectionsOf(highlights, groups);
  // The regions in the order their rows show.
  const order = [...sections.groups.flatMap(({ members }) => members), ...sections.ungrouped].map(
    ({ id }) => id,
  );
  const ungrouped = new Set(sections.ungrouped);
  const empty = highlights.length === 0 && groups.length === 0;
  const card = (highlight: Highlight) => (
    <RegionCard
      key={highlight.id}
      highlight={highlight}
      onAddToNewGroup={addToNewGroup}
      onMove={(regionId) => rowFocus.focusNext([regionId])}
      onDelete={(regionId) => rowFocus.focusNext(neighbors(order, [regionId]))}
      actionsRef={rowFocus.actionsRef(highlight.id)}
      {...stores}
    />
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <SectionHeader
          title="Regions"
          count={highlights.length || undefined}
          actions={[
            {
              label: "Add region",
              icon: <Add />,
              onClick: () => toggle("region", addRegionButton.current),
              expanded: form?.kind === "region",
              controls: formId,
              ref: addRegionButton,
            },
            {
              label: "Add group",
              icon: <CreateNewFolder />,
              onClick: () => toggle("group", addGroupButton.current),
              expanded: form?.kind === "group",
              controls: formId,
              ref: addGroupButton,
            },
          ]}
        />
      </Box>
      {form && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          {form.kind === "region" ? (
            <AddRegionForm
              id={formId}
              browserStore={browserStore}
              defaultName={nextRegionName(highlights)}
              onAdd={(name, region) => {
                saveRegion(browserStore, region, name);
                closeForm();
              }}
              onCancel={closeForm}
            />
          ) : (
            <NewGroupForm
              // A new opening, such as from another region's menu, starts over.
              key={form.regionId ?? ""}
              id={formId}
              defaults={newGroupDefaults(groups)}
              // The regions in no group, and the one whose menu opened it, which starts checked.
              candidates={highlights
                .filter((highlight) => ungrouped.has(highlight) || highlight.id === form.regionId)
                .map((highlight) => {
                  const { start, end } = positionsOf(highlight.region);
                  return {
                    id: highlight.id,
                    name: regionName(highlight),
                    positions: `${start}-${end}`,
                  };
                })}
              initialRegionIds={form.regionId === undefined ? [] : [form.regionId]}
              onCreate={({ applyColor, regionIds, ...group }) => {
                const created = regionGroupStore.getState().createGroup(group, regionIds);
                // Nothing changed, so the form stays open to show why.
                if (!created.ok) return created.error;
                if (applyColor && group.color)
                  setRegionsColor(browserStore, regionIds, group.color);
                // The region whose menu opened the form moves into the group, and focus with it.
                if (form.regionId !== undefined && regionIds.includes(form.regionId)) {
                  rowFocus.focusNext([form.regionId]);
                  setForm(null);
                } else closeForm();
              }}
              onCancel={closeForm}
            />
          )}
        </Box>
      )}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", px: 1 }}>
        {!empty && (
          <Box
            sx={{
              mx: 0.5,
              p: 0.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.default",
            }}
          >
            <List
              ref={listRef}
              aria-label="Saved regions"
              // Takes focus when no shown row can take over from one that left.
              tabIndex={-1}
              disablePadding
              sx={listSx}
            >
              {sections.groups.map(({ group, members }) => (
                <RegionGroupSection
                  key={group.id}
                  group={group}
                  onUngroup={() => rowFocus.focusNext(members.map(({ id }) => id))}
                  onDelete={() => rowFocus.focusNext(neighbors(order, group.regionIds))}
                  {...stores}
                >
                  {members.map(card)}
                </RegionGroupSection>
              ))}
              {/* The regions in no group follow the groups, with no heading of their own. */}
              {sections.ungrouped.map(card)}
            </List>
          </Box>
        )}
        {highlights.length === 0 && (
          <Box sx={{ px: 1, pt: empty ? 0 : 1 }}>
            <EmptyState
              title="No regions yet"
              description="Add the current view, or enter coordinates, to save a region."
            />
          </Box>
        )}
      </Box>
      <Box sx={{ p: 1, pb: 1.5 }}>
        <DeleteAllButton
          regionGroupStore={regionGroupStore}
          disabled={empty}
          onDelete={() => rowFocus.focusNext([])}
        />
      </Box>
    </Box>
  );
}

/** Deletes every saved region and group after asking, since it cannot be undone. */
function DeleteAllButton({
  regionGroupStore,
  disabled,
  onDelete,
}: Pick<StoresProps, "regionGroupStore"> & {
  disabled: boolean;
  /** Called as it deletes, so focus can leave the button, which it disables. */
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(false);
  return (
    <>
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<DeleteOutline />}
        disabled={disabled}
        onClick={() => setConfirming(true)}
        // A quiet border, with the form buttons' sentence-case label.
        sx={{ ...formButtonSx, borderColor: "divider", fontWeight: "fontWeightMedium" }}
      >
        Delete all regions
      </Button>
      <ConfirmDialog
        tone="danger"
        open={confirming}
        title="Delete all regions?"
        text="Every saved region, its highlight, and every group will be removed from this session."
        confirmLabel="Delete all"
        onConfirm={() => {
          onDelete();
          regionGroupStore.getState().deleteAll();
        }}
        onClose={close}
      />
    </>
  );
}

type RegionCardProps = StoresProps & {
  highlight: Highlight;
  onAddToNewGroup: AddToNewGroup;
  /** Called as the region moves into or out of a group. */
  onMove: (regionId: string) => void;
  /** Called as the region is deleted. */
  onDelete: (regionId: string) => void;
  actionsRef: Ref<HTMLButtonElement>;
};

/** A saved region: its color, name, and coordinates. Clicking it goes there. */
function RegionCard({
  highlight,
  browserStore,
  regionGroupStore,
  onAddToNewGroup,
  onMove,
  onDelete,
  actionsRef,
}: RegionCardProps) {
  const useBrowserStore = browserStore;
  const shownChromosome = useBrowserStore((state) => state.region.chromosome);
  // A boolean, so panning re-renders only the cards it moves onto or off of.
  const current = useBrowserStore((state) =>
    sameRegion(regionOf(highlight, state.region.chromosome), state.region),
  );
  const hidden = highlight.hidden === true;
  const region = regionOf(highlight, shownChromosome);

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <RegionActions
          highlight={highlight}
          browserStore={browserStore}
          regionGroupStore={regionGroupStore}
          onAddToNewGroup={onAddToNewGroup}
          onMove={onMove}
          onDelete={onDelete}
          buttonRef={actionsRef}
        />
      }
      sx={{ "& .MuiListItemSecondaryAction-root": { right: 4 } }}
    >
      <ListItemButton
        selected={current}
        aria-current={current ? "location" : undefined}
        onClick={() => browserStore.getState().setRegion(region)}
        sx={cardSx}
      >
        <ColorDot
          color={highlight.color}
          size={10}
          outlined={highlight.type === "outlined"}
          faded={hidden}
          sx={{ mr: 1.5 }}
        />
        <ListItemText
          primary={regionName(highlight)}
          secondary={`${formatDisplayRegion(region)}${hidden ? " · Hidden" : ""}`}
          slotProps={{
            primary: {
              noWrap: true,
              sx: { color: current ? "primary.main" : undefined },
            },
            secondary: {
              noWrap: true,
              variant: "caption",
              display: "block",
              sx: { fontFamily: "monospace" },
            },
          }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </ListItem>
  );
}

/** A plain row, tinted with the primary color while the view shows its region. */
const cardSx = {
  alignItems: "center",
  py: 0.75,
  pl: 1.5,
  // Room for the actions button.
  pr: 5,
  borderRadius: 1.5,
  "&.Mui-selected, &.Mui-selected:hover": {
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.08),
  },
} as const;
