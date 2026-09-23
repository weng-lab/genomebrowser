import { Box, Link, Stack, Typography } from "@mui/material";

export function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{ borderTop: 1, borderColor: "divider", px: { xs: 2, md: 4 }, py: 3 }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
      >
        <Box>
          <Typography variant="body2" fontWeight={600}>
            Genome Browser
          </Typography>
          <Typography variant="caption" color="text.secondary">
            UMass Chan Medical School · Weng Lab
          </Typography>
        </Box>
        <Stack component="nav" aria-label="Resources" direction="row" spacing={3}>
          <Link
            href="https://github.com/weng-lab/genomebrowser"
            variant="body2"
            color="text.secondary"
          >
            Source code
          </Link>
          <Link
            href="https://github.com/weng-lab/genomebrowser/issues"
            variant="body2"
            color="text.secondary"
          >
            Report an issue
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
}
