"use client";

import { UserAvatar, useAuth, useClerk } from "@clerk/nextjs";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSession } from "../../sessions/SessionProvider";

/** How the server identifies users, resolved for each request by the workspace layout. */
export type Account =
  | { mode: "clerk"; signInPath: string }
  | { mode: "mock"; userId: string | null; users: readonly string[]; cookie: string };

type Change = () => void | Promise<void>;

/**
 * Account actions in the sidebar. Signing out or switching users first closes
 * the open session, saving its edits. If they cannot be saved, the user stays,
 * tries again, or discards them before the account changes.
 */
export function AccountControls({ account }: { account: Account }) {
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
      {account.mode === "clerk" ? (
        <ClerkControls signInPath={account.signInPath} leaving={leaving} leave={leave} />
      ) : (
        <MockUserMenu {...account} leaving={leaving} leave={leave} />
      )}
      <Dialog open={unsaved !== undefined} onClose={() => setUnsaved(undefined)}>
        <DialogTitle>Changes not saved</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The open session&apos;s latest changes could not be saved. Stay to keep them, or discard
            them and continue.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnsaved(undefined)}>Stay</Button>
          <Button onClick={() => void leave(unsaved!)}>Try again</Button>
          <Button color="error" onClick={() => void leave(unsaved!, true)}>
            Discard changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

type LeaveProps = { leaving: boolean; leave: (change: Change) => Promise<void> };

function ClerkControls({ signInPath, leaving, leave }: { signInPath: string } & LeaveProps) {
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

/** Local development only: act as one of the mock users, or as signed out. */
function MockUserMenu({
  userId,
  users,
  cookie,
  leaving,
  leave,
}: { userId: string | null; users: readonly string[]; cookie: string } & LeaveProps) {
  function actAs(user: string, dismiss: () => void) {
    dismiss();
    // oxlint-disable-next-line typescript/no-floating-promises -- close observes Effect and account-change failures, so leave always resolves.
    void leave(() => {
      document.cookie = `${cookie}=${user}; path=/; SameSite=Lax`;
      window.location.reload();
    });
  }
  return (
    <AccountMenu
      label="Mock user"
      title={userId ? `Mock user ${userId}` : "Signed out"}
      icon={userId ? <PersonOutline /> : <LoginOutlined />}
    >
      {(dismiss) =>
        [...users, null].map((user) => (
          <MenuItem
            key={user ?? "signed-out"}
            selected={user === userId}
            disabled={leaving || user === userId}
            onClick={() => actAs(user ?? "signed-out", dismiss)}
          >
            {user ?? "Signed out"}
          </MenuItem>
        ))
      }
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
