# Track mutations return results

Track config validation is owned by the track store when configs enter or change track state, so store mutators return typed success/error results instead of throwing for expected validation failures. This keeps browser runtime code trusting store state while letting settings panels and external UIs display mutation errors at the caller that attempted the change.
