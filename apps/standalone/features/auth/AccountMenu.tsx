"use client";

import { useAuth } from "@clerk/nextjs";
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useId, useState } from "react";

type AccountMenuProps = {
  name: string;
  email?: string;
  imageUrl?: string;
};

export function AccountMenu({ name, email, imageUrl }: AccountMenuProps) {
  const { signOut, sessionId } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const id = useId();
  const menuId = `${id}-menu`;
  const buttonId = `${id}-button`;
  const dialogTitleId = `${id}-delete-title`;
  const dialogDescriptionId = `${id}-delete-description`;
  const menuOpen = Boolean(anchorEl);

  function closeMenu() {
    if (signingOut) return;
    setAnchorEl(null);
    setSignOutError(null);
  }

  async function handleSignOut() {
    if (signingOut || !sessionId) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut({ sessionId, redirectUrl: "/" });
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <Button
        id={buttonId}
        color="inherit"
        aria-haspopup="menu"
        aria-controls={menuOpen ? menuId : undefined}
        aria-expanded={menuOpen ? true : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ maxWidth: { xs: 160, sm: 240 }, minWidth: 0, gap: 1 }}
      >
        <Avatar
          src={imageUrl}
          alt=""
          aria-hidden="true"
          sx={{ width: 28, height: 28, fontSize: "0.875rem" }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </Avatar>
        <Typography component="span" noWrap>
          {name}
        </Typography>
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        slotProps={{
          list: { "aria-labelledby": buttonId },
          paper: { sx: { minWidth: 200, maxWidth: "calc(100vw - 32px)" } },
        }}
      >
        {email && (
          <MenuItem disabled>
            <Typography variant="body2" noWrap>
              {email}
            </Typography>
          </MenuItem>
        )}
        {email && <Divider />}
        <MenuItem
          disabled={signingOut}
          sx={{ color: "error.main" }}
          onClick={() => {
            closeMenu();
            setDeleteDialogOpen(true);
          }}
        >
          Delete account
        </MenuItem>
        <MenuItem disabled={signingOut || !sessionId} onClick={handleSignOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </MenuItem>
        {signOutError && (
          <li>
            <Alert severity="error" sx={{ mx: 1, mt: 1 }}>
              {signOutError}
            </Alert>
          </li>
        )}
      </Menu>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
      >
        <DialogTitle id={dialogTitleId}>Delete account</DialogTitle>
        <DialogContent>
          <DialogContentText id={dialogDescriptionId}>
            Your account is shared with API Console. Continue there to delete it and remove its API
            keys. This will also remove your access to this account in Genome Browser.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button href="https://console.wenglab.org/dashboard" variant="contained" color="error">
            Continue to API Console
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
