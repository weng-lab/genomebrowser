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
import { IconButton, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import type { KeyboardEvent, PointerEvent } from "react";

type PriorityOption = { id: string; label: string };

// A dragged row's transform counts toward the dialog's scroll height, so an
// unbounded drag grows the content and auto-scroll chases it indefinitely.
const dragModifiers = [restrictToVerticalAxis, restrictToParentElement];

/** Drag-to-reorder priority list; the top option sorts first and the rest break ties. */
export function TrackSortPriorityList({
  options,
  onReorder,
  onRemove,
  onMovingChange,
}: {
  options: readonly PriorityOption[];
  onReorder: (ids: string[]) => void;
  /** Shows a remove button on each row when supplied. */
  onRemove?: (id: string) => void;
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
        No sort options are selected. Applying keeps the current track order.
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
              onRemove={onRemove}
            />
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
}

// The whole row is the drag handle, so keep presses on the remove button from starting a move.
function stopDragActivation(event: PointerEvent | KeyboardEvent) {
  if (!("key" in event) || event.key === " " || event.key === "Enter") event.stopPropagation();
}

function PriorityRow({
  option,
  primary,
  onRemove,
}: {
  option: PriorityOption;
  primary: boolean;
  onRemove?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });

  return (
    <ListItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      secondaryAction={
        onRemove ? (
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
        ) : undefined
      }
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        mb: 1,
        bgcolor: isDragging ? "action.selected" : "background.paper",
        cursor: isDragging ? "grabbing" : "grab",
        position: "relative",
        zIndex: isDragging ? 1 : "auto",
        "&:last-of-type": { mb: 0 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        <DragIndicatorIcon fontSize="small" color="disabled" />
      </ListItemIcon>
      <ListItemText primary={option.label} secondary={primary ? "Primary sort" : "Tiebreaker"} />
    </ListItem>
  );
}
