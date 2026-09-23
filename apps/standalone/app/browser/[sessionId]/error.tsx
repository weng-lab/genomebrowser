"use client";
import { Alert, Button, Container } from "@mui/material";

export default function SessionError({ reset }: { reset: () => void }) {
  return (
    <Container sx={{ py: 4 }}>
      <Alert severity="error">This session could not be loaded.</Alert>
      <Button onClick={reset}>Try again</Button>
    </Container>
  );
}
