"use client";

import Link from "next/link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

export function CollectionPanel({
  collections,
  selectedId,
}: {
  collections: { id: string; label: string; trackCount: number }[];
  selectedId: string;
}) {
  return (
    <List
      component="nav"
      aria-label="Track collections"
      dense
      sx={{ px: 1, flex: 1, minHeight: 0, overflowY: "auto" }}
    >
      {collections.map((collection) => (
        <ListItemButton
          key={collection.id}
          component={Link}
          href={`/collections/${collection.id}`}
          selected={collection.id === selectedId}
          aria-current={collection.id === selectedId ? "page" : undefined}
          sx={{ borderRadius: 1 }}
        >
          <ListItemText
            primary={collection.label}
            secondary={`${collection.trackCount.toLocaleString("en-US")} tracks`}
            slotProps={{
              primary: { sx: { overflowWrap: "anywhere" } },
              secondary: { sx: { mt: 0.5 } },
            }}
          />
        </ListItemButton>
      ))}
    </List>
  );
}
