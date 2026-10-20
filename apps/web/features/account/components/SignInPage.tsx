import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { identityMode, signInPath } from "../server/identity";

export function SignInPage() {
  if (identityMode(process.env) === "mock") notFound();
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <SignIn path={signInPath} fallbackRedirectUrl="/browser" />
    </main>
  );
}
