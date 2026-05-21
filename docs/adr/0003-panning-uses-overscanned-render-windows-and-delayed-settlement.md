# Panning uses overscanned render windows and delayed settlement

v2 panning renders an expanded genomic window, moves SVG content directly during drag, keeps previous successful data while new data loads, and unlocks committed panning only after data for the current render signature settles. This is more coordinated than updating the visible region directly on every drag, but it preserves smooth interaction, avoids blank reloads during normal pans, and prevents stale async data from becoming the displayed render window.
