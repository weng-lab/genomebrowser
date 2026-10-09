import ArrowUpward from "@mui/icons-material/ArrowUpward";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";

export function AgentPanel() {
  return (
    <>
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 1.5 }} />
      <Box
        component="form"
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          m: 1.5,
          p: 1,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        {/* Disabled until a chat provider is connected. */}
        <InputBase
          multiline
          maxRows={6}
          disabled
          placeholder="No agent connected"
          inputProps={{ "aria-label": "Message" }}
          sx={{ flexGrow: 1, px: 0.5 }}
        />
        <IconButton type="submit" aria-label="Send" size="small" disabled>
          <ArrowUpward fontSize="small" />
        </IconButton>
      </Box>
    </>
  );
}
