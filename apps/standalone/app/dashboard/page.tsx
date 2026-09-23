import { getCurrentUserCustomTracks } from "../../features/custom-tracks/queries";
import type { Metadata } from "next";
import { AuthUnavailable } from "../../features/auth/AuthUnavailable";
import { getCurrentUserSessions } from "../../features/sessions/queries";
import { SessionDashboard } from "../../features/sessions/SessionDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const result = await getCurrentUserSessions();
  if (result.status === "auth-unavailable") return <AuthUnavailable />;
  const customTracks = await getCurrentUserCustomTracks();
  return <SessionDashboard result={result} customTracks={customTracks} />;
}
