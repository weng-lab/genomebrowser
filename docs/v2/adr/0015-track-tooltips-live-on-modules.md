# Track tooltips live on modules

Status: accepted

Track configs are per-instance runtime data and renderer inputs, including fields such as URL, color, height, display mode, fetch settings, and app callbacks like `onClick`, `onHover`, and `onLeave`. Tooltip React components are stable track-type behavior, so they live only on `TrackModule.tooltipComponent`; configs and module defaults do not provide a tooltip override path. This keeps config focused on instance state, avoids storing stable React components on every track instance, and still lets callbacks remain config-owned because they may close over app state.
