import { Box, Typography } from "@mui/material";
import type { TrackPreviewKind } from "../catalog";

/** Schematic examples, not fetched genomic data. */
export function TrackPreview({ kind }: { kind: TrackPreviewKind }) {
  return (
    <Box
      sx={{
        bgcolor: "action.hover",
        color: "primary.main",
        p: 1.5,
        minWidth: 0,
        height: "100%",
        display: "grid",
        alignContent: "center",
      }}
    >
      <svg viewBox="0 0 240 80" width="100%" height="80" aria-hidden="true">
        <path d="M0 65H240" stroke="currentColor" opacity=".25" />
        {kind === "signal" || kind === "stranded-signal" ? (
          <>
            <path
              d="M0 65L0 58L15 58L15 49L25 49L25 60L45 60L45 31L55 31L55 17L65 17L65 39L80 39L80 57L110 57L110 45L125 45L125 25L140 25L140 49L160 49L160 61L180 61L180 38L190 38L190 10L205 10L205 45L220 45L220 58L240 58L240 65Z"
              fill="currentColor"
              opacity=".7"
            />
            {kind === "stranded-signal" && (
              <path
                d="M0 68H35V76H50V68H95V73H120V68H160V78H180V68H240"
                fill="none"
                stroke="currentColor"
                opacity=".45"
              />
            )}
          </>
        ) : kind === "ruler" ? (
          <>
            <path
              d="M0 35H240M20 25V45M60 30V40M100 25V45M140 30V40M180 25V45M220 30V40"
              stroke="currentColor"
            />
            <text x="10" y="63" fill="currentColor" fontSize="13" letterSpacing="9">
              A C T G C A T G
            </text>
          </>
        ) : (
          [20, 40, 60].map((y, row) => (
            <g key={y} opacity={1 - row * 0.2}>
              {kind === "genes" && <path d={`M15 ${y}H225`} stroke="currentColor" />}
              {[15, 65, 140, 200].map((x, i) => (
                <rect
                  key={x}
                  x={x + row * 4}
                  y={y - 5}
                  width={i % 2 ? 22 : 35}
                  height="10"
                  rx="1"
                  fill="currentColor"
                />
              ))}
            </g>
          ))
        )}
      </svg>
      <Typography variant="caption" color="text.secondary">
        Example preview
      </Typography>
    </Box>
  );
}
