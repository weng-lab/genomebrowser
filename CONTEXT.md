# Context

## Interaction gate

The interaction gate is the Browser-level module that blocks user interactions while the Browser is not settled. It prevents track mutations and SVG pointer interactions while track data is updating, then releases callers once the Browser can safely accept changes again.
