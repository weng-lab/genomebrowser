"use client";

import { useUser } from "@clerk/nextjs";
import { Button, Skeleton } from "@mui/material";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";

export function AccountControls() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <Skeleton width={76} height={36} />;

  if (!isSignedIn) {
    return (
      <Button component={Link} href="/sign-in" variant="outlined" size="small">
        Sign in
      </Button>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress;
  return (
    <AccountMenu
      key={user.id}
      name={user.firstName || user.fullName || email || "Account"}
      email={email}
      imageUrl={user.hasImage ? user.imageUrl : undefined}
    />
  );
}
