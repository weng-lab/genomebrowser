"use client";

import { useSession } from "../../../sessions/SessionProvider";

export function SessionName() {
  return useSession((session) => session.active?.name) ?? null;
}
