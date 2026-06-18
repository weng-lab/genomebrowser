# Track state is validated through registered modules

Track configs in v2 are validated through their registered track modules before entering or changing track state, rather than treating the store as a passive list of objects. This couples the track store to the module registry, but it keeps runtime state valid, fails early for unknown or malformed tracks, and prevents updates like changing a track's `type` without recreating the track through the correct module.
