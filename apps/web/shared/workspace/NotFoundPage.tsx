"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { WorkspacePage } from "./WorkspacePage";

export function NotFoundPage() {
  return (
    <WorkspacePage title="Page not found">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          py: 8,
          px: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h3" component="h1">
          404
        </Typography>
        <Typography color="text.secondary">The page you’re looking for doesn’t exist.</Typography>
        <Button component={Link} href="/browser" variant="contained">
          Back to browser
        </Button>
      </Box>
    </WorkspacePage>
  );
}
