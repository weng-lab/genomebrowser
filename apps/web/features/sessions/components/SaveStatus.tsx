"use client";

import { StatusTag, type StatusTone } from "../../../shared/ui/StatusTag";
import { narrowTitleRow } from "../../../shared/workspace/frame/layout";
import type { SaveStatus as Status } from "../autosave";
import { useSession } from "../SessionProvider";

/**
 * How each status looks: a short label, a tone, and a dot, or a spinner while a write is
 * in flight. The alert above the browser explains failures in full.
 */
const looks = {
  saved: { label: "All changes saved", tone: "success", busy: false },
  saving: { label: "Saving…", tone: "neutral", busy: true },
  retrying: { label: "Retrying…", tone: "warning", busy: true },
  conflict: { label: "Changed elsewhere", tone: "error", busy: false },
  failed: { label: "Not saved", tone: "error", busy: false },
} satisfies Record<Status, { label: string; tone: StatusTone; busy: boolean }>;

/** A tag showing whether the open session's edits are saved. Nothing while no session is open. */
export function SaveStatus() {
  const status = useSession((session) => session.saveStatus);
  if (!status) return null;
  const { label, tone, busy } = looks[status];
  // Just the dot or spinner in a narrow title row, so the session name keeps its room.
  return <StatusTag label={label} tone={tone} busy={busy} compactWhen={narrowTitleRow} />;
}
