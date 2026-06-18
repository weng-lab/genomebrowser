# Track configs hold instance state; modules hold stable behavior

Track configs are per-instance runtime state and renderer inputs: identity, title, display mode, height, color, data-source fields such as URLs, render-affecting options, and app callbacks such as `onClick`, `onHover`, and `onLeave` that may close over app state for that specific track instance. Configs should not become mini modules or carry stable React components and track-type behavior.

Track modules hold behavior that defines the track type: schema, create/validate logic, fetchers, render components, settings components, tooltip components, and module-authored defaults. If a value changes how one track instance renders or interacts at runtime, it belongs in config; if changing it would redefine what the track type is capable of, it belongs on the module.
