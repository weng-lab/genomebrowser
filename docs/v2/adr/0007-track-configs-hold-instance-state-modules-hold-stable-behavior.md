# Track configs hold instance state; modules hold stable behavior

Track instances are per-instance runtime state and renderer inputs. Browser-owned base state holds identity, title, display mode, height, and color. Module-owned `config` holds data-source fields such as URLs and render-affecting options. Optional `interaction` holds app callbacks such as `onClick`, `onHover`, and `onLeave` that may close over app state for that specific track instance. Instance state should not become a mini module or carry stable React components and track-type behavior.

Track modules hold behavior that defines the track type: config schema, create/validate logic, fetchers, render components, settings components, tooltip components, and module-authored defaults. If a value changes how one track instance renders or interacts at runtime, it belongs in the instance's base, config, or interaction state; if changing it would redefine what the track type is capable of, it belongs on the module.
