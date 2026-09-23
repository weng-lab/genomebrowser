import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function AuthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  if (!enabled) return children;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/browser"
      signUpFallbackRedirectUrl="/browser"
      afterSignOutUrl="/"
      localization={{
        signIn: {
          start: {
            title: "Sign in to Genome Browser",
            subtitle: "Use your Genome Browser or API Console account.",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "One account for Genome Browser and API Console.",
          },
        },
      }}
      appearance={{
        variables: {
          colorPrimary: "#116c67",
          fontFamily: "Arial, Helvetica, sans-serif",
          borderRadius: "0.5rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
