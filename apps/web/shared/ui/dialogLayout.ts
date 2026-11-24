/**
 * Fields stacked below a dialog's title, with room above the first one's floating label.
 * MUI removes the content's top padding after a title, so this restores some.
 */
export const dialogFieldsSx = {
  display: "flex",
  flexDirection: "column",
  gap: 2.5,
  "&&": { pt: 1 },
} as const;

/** A dialog's buttons, lined up with its title and content rather than MUI's tighter inset. */
export const dialogActionsSx = { px: 3, pb: 2.5 } as const;
