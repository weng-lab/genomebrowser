import type { Metadata } from "next";
import { AuthUnavailable } from "@/features/auth/AuthUnavailable";
import { getCurrentUserCustomTracks } from "@/features/custom-tracks/queries";
import { getCurrentUserSessions } from "@/features/sessions/queries";
import { Dashboard } from "./_components/Dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const sessions = await getCurrentUserSessions();
  if (sessions.status === "auth-unavailable") return <AuthUnavailable />;
  const customTracks = await getCurrentUserCustomTracks();
  return <Dashboard sessions={sessions} customTracks={customTracks} />;
}
