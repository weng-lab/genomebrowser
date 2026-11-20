import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { KeyboardEvent, PointerEvent } from "react";
import { directionLabels, valueTypeLabel } from "./trackSortLabels";
import type { TrackSortDirection, TrackSortValueType } from "./trackSortOrder";

type PriorityOption = {
  id: string;
  label: string;
  types: readonly TrackSortValueType[];
  direction: TrackSortDirection;
};

// A dragged row's transform counts toward the dialog's scroll height, so an
// unbounded drag grows the content and auto-scroll chases it indefinitely.
const dragModifiers = [restrictToVerticalAxis, restrictToParentElement];

/**
 * Drag-to-reorder priority list; the top option sorts first and the rest break ties. Each
 * row has its own direction and a remove button.
 */
export function TrackSortPriorityList({
  options,
  onReorder,
  onDirectionChange,
  onRemove,
  onMovingChange,
}: {
  options: readonly PriorityOption[];
  onReorder: (ids: string[]) => void;
  onDirectionChange: (id: string, direction: TrackSortDirection) => void;
  onRemove: (id: string) => void;
  /** Reports whether a row is being moved, so the dialog can leave Escape to cancel the move. */
  onMovingChange: (moving: boolean) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = options.map(({ id }) => id);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    onMovingChange(false);
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  if (options.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No options added yet. Add one above to sort by it.
      </Typography>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      modifiers={dragModifiers}
      onDragStart={() => onMovingChange(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => onMovingChange(false)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <List disablePadding aria-label="Sort priority">
          {options.map((option, index) => (
            <PriorityRow
              key={option.id}
              option={option}
              primary={index === 0}
              onDirectionChange={onDirectionChange}
              onRemove={onRemove}
            />
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
}

// The whole row is the drag handle, so keep presses on the row's buttons from starting a move.
function stopDragActivation(event: PointerEvent | KeyboardEvent) {
  if (!("key" in event) || event.key === " " || event.key === "Enter") event.stopPropagation();
}

function PriorityRow({
  option,
  primary,
  onDirectionChange,
  onRemove,
}: {
  option: PriorityOption;
  primary: boolean;
  onDirectionChange: (id: string, direction: TrackSortDirection) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });
  const valueType = valueTypeLabel(option.types);
  const directions = directionLabels(option.types);
  const priority = primary ? "Primary sort" : "Tiebreaker";

  return (
    <ListItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        // On narrow screens the direction and remove controls wrap below the label.
        flexWrap: "wrap",
        columnGap: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        mb: 1,
        // The selected tint is translucent, so layer it over a solid background to keep
        // the rows behind a dragged row from showing through.
        bgcolor: "background.paper",
        backgroundImage: ({ palette }) =>
          isDragging
            ? `linear-gradient(${palette.action.selected}, ${palette.action.selected})`
            : "none",
        boxShadow: isDragging ? 4 : 0,
        cursor: isDragging ? "grabbing" : "grab",
        position: "relative",
        zIndex: isDragging ? 1 : "auto",
        "&:last-of-type": { mb: 0 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        <DragIndicatorIcon fontSize="small" color="disabled" />
      </ListItemIcon>
      <ListItemText
        primary={option.label}
        secondary={valueType ? `${valueType} · ${priority}` : priority}
        sx={{ flex: "1 1 8rem" }}
      />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={option.direction}
        aria-label={`${option.label} sort direction`}
        onPointerDown={stopDragActivation}
        onKeyDown={stopDragActivation}
        // Choosing the selected direction again reports null; keep the direction.
        onChange={(_, direction: TrackSortDirection | null) => {
          if (direction) onDirectionChange(option.id, direction);
        }}
      >
        <ToggleButton value="ascending">{directions.ascending}</ToggleButton>
        <ToggleButton value="descending">{directions.descending}</ToggleButton>
      </ToggleButtonGroup>
      <IconButton
        edge="end"
        size="small"
        aria-label={`Remove ${option.label}`}
        onPointerDown={stopDragActivation}
        onKeyDown={stopDragActivation}
        onClick={() => onRemove(option.id)}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </ListItem>
  );
}
