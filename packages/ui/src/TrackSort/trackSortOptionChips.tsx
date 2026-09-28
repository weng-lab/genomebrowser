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
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      {options.map(({ id, label }) => {
        const included = includedIds.includes(id);

        return (
          <Chip
            key={id}
            label={label}
            aria-pressed={included}
            onClick={() => onToggle(id)}
            variant={included ? "filled" : "outlined"}
            color={included ? "primary" : "default"}
            sx={{ textDecoration: included ? "none" : "line-through" }}
          />
        );
      })}
    </Stack>
  );
}
