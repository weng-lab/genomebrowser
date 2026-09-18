# Shared runtime dependencies

Use the exact versions in the `pnpm-workspace.yaml` catalog for React, React
DOM, React types, Zustand, Emotion, and MUI dependencies. Reference them with
`catalog:` in workspace dependencies and library development dependencies.
Libraries must also declare their runtime peers as development dependencies
so local builds use the same versions as the apps. Keep published peer
dependency ranges compatible rather than pinning them to the catalog.

The standalone starter in `packages/create/template` maintains its own
dependency versions and does not use the workspace catalog.
