"use client";

import { useSession } from "../SessionProvider";

export function SessionName() {
  return useSession((session) => session.active?.name) ?? null;
}
