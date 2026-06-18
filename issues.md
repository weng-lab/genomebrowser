# Issues

## Clarify the `useModuleRuntime` seam

The `useModuleRuntime` hook currently exposes browser-backed services to track modules, but the boundary is blurry. Some values may be legitimate module-author utilities, while others may leak browser orchestration details into renderers.

We should decide whether this hook is the right public seam for track modules, or whether v2 needs a narrower module-author runtime API focused on enhancing custom track development. For example, tooltip helpers and auto-height support may belong there, while raw browser interaction state such as panning may be better kept internal to browser/runtime helpers.

I think we would prefer each feature/module to have its own provider and hooks that it passes along, and if we want ot keep module runtime, we instead just use it as a wrapper component for all the providers. A provider provider if you will.

## Simplify code architecture

Organize the code by feature, not file responsibility/boundary.
