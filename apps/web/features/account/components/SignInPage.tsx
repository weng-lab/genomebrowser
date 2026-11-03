import { SignIn } from "@clerk/nextjs";
import { signInPath } from "../signIn";

export function SignInPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <SignIn path={signInPath} fallbackRedirectUrl="/browser" />
    </main>
  );
}
