import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { Box } from "@mui/material";
import { AuthUnavailable } from "@/features/auth/AuthUnavailable";
import { isAuthConfigured } from "@/features/auth/config";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  if (!isAuthConfigured()) return <AuthUnavailable />;
  return (
    <Box sx={{ display: "flex", justifyContent: "center", px: 2, py: { xs: 5, md: 8 } }}>
      <SignUp />
    </Box>
  );
}
