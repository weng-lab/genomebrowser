# Track instances split browser base, module config, and interaction

v2 track runtime state is stored as `TrackInstance = { type, base, config, interaction? }`, while module `create` keeps a flat public input for user ergonomics. This separates browser-owned state from module-owned config and instance-owned callbacks, keeps fetch/render/settings APIs narrow, and preserves module-owned stable behavior such as tooltip components on the module instead of the track instance.
