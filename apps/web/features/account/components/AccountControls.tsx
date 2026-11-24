"use client";

import { UserAvatar, useAuth, useClerk } from "@clerk/nextjs";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog";
import { useSession } from "../../sessions/SessionProvider";
import { signInPath } from "../signIn";

type Change = () => void | Promise<void>;

/**
 * Account actions in the sidebar. Signing out or managing the account first
 * closes the open session, saving its edits. If they cannot be saved, the user
 * stays, tries again, or discards them before the account changes.
 */
export function AccountControls() {
  const close = useSession((session) => session.close);
  const [leaving, setLeaving] = useState(false);
  const [unsaved, setUnsaved] = useState<Change>();

  async function leave(change: Change, discard = false) {
    setUnsaved(undefined);
    setLeaving(true);
    const closed = await close({ discard, next: change });
    setLeaving(false);
    if (!closed) setUnsaved(() => change);
  }

  return (
    <>
      <ClerkControls leaving={leaving} leave={leave} />
      <ConfirmDialog
        open={unsaved !== undefined}
        title="Changes not saved"
        text="The open session’s latest changes could not be saved. Stay to keep them, or discard them and continue."
        cancelLabel="Stay"
        actions={<Button onClick={() => void leave(unsaved!)}>Try again</Button>}
        confirmLabel="Discard changes"
        tone="danger"
        onConfirm={() => void leave(unsaved!, true)}
        onClose={() => setUnsaved(undefined)}
      />
    </>
  );
}

type LeaveProps = { leaving: boolean; leave: (change: Change) => Promise<void> };

function ClerkControls({ leaving, leave }: LeaveProps) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  if (!isSignedIn) {
    return (
      <Tooltip title="Sign in" placement="right">
        <IconButton component={Link} href={signInPath} aria-label="Sign in">
          <LoginOutlined />
        </IconButton>
      </Tooltip>
    );
  }
  // Clerk's user button signs out without asking the app, so the menu is the app's.
  return (
    <AccountMenu label="Account" title="Account" icon={<UserAvatar />}>
      {(dismiss) => [
        <MenuItem
          key="manage"
          disabled={leaving}
          onClick={() => {
            dismiss();
            // oxlint-disable-next-line typescript/no-floating-promises -- close observes Effect and account-change failures, so leave always resolves.
            void leave(() => clerk.openUserProfile());
          }}
        >
          Manage account
        </MenuItem>,
        <MenuItem
          key="sign-out"
          disabled={leaving}
          onClick={() => {
            dismiss();
            // oxlint-disable-next-line typescript/no-floating-promises -- close observes Effect and account-change failures, so leave always resolves.
            void leave(() => clerk.signOut());
          }}
        >
          Sign out
        </MenuItem>,
      ]}
    </AccountMenu>
  );
}

function AccountMenu({
  label,
  title,
  icon,
  children,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  children: (dismiss: () => void) => ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const dismiss = () => setAnchor(null);
  return (
    <>
      <Tooltip title={title} placement="right">
        <IconButton aria-label={label} onClick={(event) => setAnchor(event.currentTarget)}>
          {icon}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={dismiss}>
        {children(dismiss)}
      </Menu>
    </>
  );
}
