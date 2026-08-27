import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { useState, type ComponentProps } from "react";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { useObservedGeneTags } from "./tagCatalog";
import type { GeneConfig, GeneFeature, GeneTagColor } from "./types";

type GeneSettingsProps = TrackSettingsProps<GeneConfig, GeneFeature>;

export function GeneSettings({ track, updateTrack }: GeneSettingsProps) {
  const observedTags = useObservedGeneTags(track.config.url);
  const tagColors = track.config.tagColors;
  const tagOptions = normalizeTags([...tagColors.map(({ tag }) => tag), ...observedTags]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [addingTag, setAddingTag] = useState(false);
  const [newTagColor, setNewTagColor] = useState("#000000");

  const setTagColors = (nextTagColors: GeneTagColor[]) =>
    updateTrack({ config: { tagColors: nextTagColors } });

  const updateTag = (index: number, value: string | null) => {
    const tag = value?.trim();
    if (!tag || tagColors.some((item, itemIndex) => itemIndex !== index && item.tag === tag))
      return;
    setTagColors(
      tagColors.map((item, itemIndex) => (itemIndex === index ? { ...item, tag } : item)),
    );
  };

  const addTag = (value: string | null) => {
    const tag = value?.trim();
    if (!tag || tagColors.some((item) => item.tag === tag)) return;
    const result = setTagColors([...tagColors, { tag, color: newTagColor }]);
    if (!result.ok) return;
    setAddingTag(false);
    setNewTagColor("#000000");
  };

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigGenePred">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={track.config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Gene highlighting">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TextField
                fullWidth
                label="Highlight gene"
                size="small"
                value={track.config.geneName ?? ""}
                onChange={(event) =>
                  updateTrack({ config: { geneName: event.target.value || undefined } })
                }
              />
              <TrackSettingsColorField
                label="Highlight color"
                value={track.config.highlightColor}
                onCommit={(highlightColor) => updateTrack({ config: { highlightColor } })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <DndContext
              collisionDetection={closestCenter}
              sensors={sensors}
              onDragEnd={({ active, over }) => {
                if (!over) return;
                const nextTagColors = reorderTagColors(
                  tagColors,
                  String(active.id),
                  String(over.id),
                );
                if (nextTagColors !== tagColors) setTagColors(nextTagColors);
              }}
            >
              <Box sx={{ display: "grid", gap: 1 }}>
                <SortableContext
                  items={tagColors.map(({ tag }) => tag)}
                  strategy={verticalListSortingStrategy}
                >
                  {tagColors.map((tagColor, index) => (
                    <TagColorRow
                      key={tagColor.tag}
                      color={tagColor.color}
                      options={tagOptions}
                      tag={tagColor.tag}
                      onColorChange={(color) =>
                        setTagColors(
                          tagColors.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, color } : item,
                          ),
                        )
                      }
                      onRemove={() =>
                        setTagColors(tagColors.filter((_, itemIndex) => itemIndex !== index))
                      }
                      onTagChange={(tag) => updateTag(index, tag)}
                    />
                  ))}
                </SortableContext>
                {addingTag ? (
                  <PendingTagColorRow
                    color={newTagColor}
                    options={tagOptions.filter(
                      (option) => !tagColors.some(({ tag }) => tag === option),
                    )}
                    onCancel={() => {
                      setAddingTag(false);
                      setNewTagColor("#000000");
                    }}
                    onColorChange={setNewTagColor}
                    onTagChange={addTag}
                  />
                ) : (
                  <Button
                    size="small"
                    sx={{ justifySelf: "start", minWidth: 0, px: 0.75, py: 0.25 }}
                    variant="text"
                    onClick={() => setAddingTag(true)}
                  >
                    Add tag
                  </Button>
                )}
              </Box>
            </DndContext>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function TagColorRow({
  color,
  options,
  tag,
  onColorChange,
  onRemove,
  onTagChange,
}: {
  color: string;
  options: string[];
  tag: string;
  onColorChange: (color: string) => ReturnType<GeneSettingsProps["updateTrack"]>;
  onRemove: () => void;
  onTagChange: (tag: string | null) => void;
}) {
  const { isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } =
    useSortable({ id: tag });
  const rowTransition = [transition, "box-shadow 150ms ease", "opacity 150ms ease"]
    .filter(Boolean)
    .join(", ");

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: rowTransition }}
      sx={{
        alignItems: "start",
        bgcolor: "background.paper",
        borderRadius: 1,
        boxShadow: isDragging ? 4 : 0,
        display: "flex",
        gap: 0.5,
        minWidth: 0,
        opacity: isDragging ? 0.96 : 1,
        position: "relative",
        zIndex: isDragging ? 2 : 0,
      }}
    >
      <Box
        ref={setActivatorNodeRef}
        {...listeners}
        component="span"
        data-tag-drag-handle={tag}
        sx={{
          color: "text.secondary",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          mt: 0.75,
          touchAction: "none",
        }}
        title={`Drag ${tag} to reorder`}
      >
        <DragHandleIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TrackSettingsFieldRow>
          <TagField options={options} value={tag} onChange={onTagChange} />
          <TrackSettingsColorField label={`${tag} color`} value={color} onCommit={onColorChange} />
        </TrackSettingsFieldRow>
      </Box>
      <RemoveTagButton label={tag} onClick={onRemove} />
    </Box>
  );
}

export function reorderTagColors(
  tagColors: GeneTagColor[],
  activeTag: string,
  overTag: string,
): GeneTagColor[] {
  const activeIndex = tagColors.findIndex(({ tag }) => tag === activeTag);
  const overIndex = tagColors.findIndex(({ tag }) => tag === overTag);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return tagColors;
  return arrayMove(tagColors, activeIndex, overIndex);
}

function PendingTagColorRow({
  color,
  options,
  onCancel,
  onColorChange,
  onTagChange,
}: {
  color: string;
  options: string[];
  onCancel: () => void;
  onColorChange: (color: string) => void;
  onTagChange: (tag: string | null) => void;
}) {
  return (
    <Box sx={{ alignItems: "start", display: "flex", gap: 0.5, minWidth: 0 }}>
      <Box sx={{ width: 20 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TrackSettingsFieldRow>
          <TagField autoFocus options={options} value={null} onChange={onTagChange} />
          <TrackSettingsColorField
            label="Tag color"
            value={color}
            onCommit={(nextColor) => {
              onColorChange(nextColor);
              return { ok: true };
            }}
          />
        </TrackSettingsFieldRow>
      </Box>
      <RemoveTagButton label="new tag" onClick={onCancel} />
    </Box>
  );
}

function TagField({
  autoFocus = false,
  options,
  value,
  onChange,
}: {
  autoFocus?: boolean;
  options: string[];
  value: string | null;
  onChange: (tag: string | null) => void;
}) {
  return (
    <Autocomplete
      autoSelect
      freeSolo
      options={options}
      size="small"
      value={value}
      onChange={(_event, tag) => onChange(tag)}
      renderInput={(params) => (
        <TextField
          {...(params as unknown as TextFieldProps)}
          autoFocus={autoFocus}
          label="Transcript tag"
        />
      )}
    />
  );
}

function RemoveTagButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <IconButton aria-label={`Remove ${label}`} size="small" sx={{ mt: 0.5 }} onClick={onClick}>
      <RemoveIcon fontSize="small" />
    </IconButton>
  );
}

function DragHandleIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props}>
      <path d="M9 4h2v2H9zm4 0h2v2h-2zM9 8h2v2H9zm4 0h2v2h-2zM9 12h2v2H9zm4 0h2v2h-2zM9 16h2v2H9zm4 0h2v2h-2z" />
    </SvgIcon>
  );
}

function RemoveIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props}>
      <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.7 4.29 4.29 10.59 10.59 16.89 4.29z" />
    </SvgIcon>
  );
}

function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].toSorted((left, right) =>
    left.localeCompare(right),
  );
}
