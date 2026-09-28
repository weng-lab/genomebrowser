import { Chip, Stack } from "@mui/material";

/** Toggle chips for each option; excluded options drop out of the priority list. */
export function TrackSortOptionChips({
  options,
  includedIds,
  onToggle,
}: {
  options: readonly { id: string; label: string }[];
  includedIds: readonly string[];
  onToggle: (id: string) => void;
}) {
  const included = new Set(includedIds);

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      {options.map(({ id, label }) => {
        const isIncluded = included.has(id);

        return (
          <Chip
            key={id}
            label={label}
            aria-pressed={isIncluded}
            onClick={() => onToggle(id)}
            variant={isIncluded ? "filled" : "outlined"}
            color={isIncluded ? "primary" : "default"}
            sx={{ textDecoration: isIncluded ? "none" : "line-through" }}
          />
        );
      })}
    </Stack>
  );
}
