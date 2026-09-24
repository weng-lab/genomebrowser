import { Button, Container, Typography } from "@mui/material";
import { SiteLink } from "@/components/SiteLink";

export function AuthUnavailable() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h1" sx={{ fontSize: "2rem", mb: 2 }}>
        Accounts are unavailable
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Sign-in is not enabled on this site yet. You can still explore the genome browser without an
        account.
      </Typography>
      <Button component={SiteLink} href="/browser" variant="contained">
        Open the browser
      </Button>
    </Container>
  );
}
