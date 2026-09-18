# Interface design

The browser is primarily embedded in scientific websites. Shared UI should fit those applications: compact controls, readable data, and consistent interactions. Favor clear grouping and typography over decorative panels. Keep dense workflows usable without shrinking their labels or controls.

## Fit the host application

Use MUI for application controls and draw interface colors, spacing, and typography from the active theme. Do not impose global resets or a shared theme on the host. Scientific colors belong to track configuration and should remain independent of interface styling.

The UI package provides controls for embedding applications. The standalone app may reuse them or build its own interface. Follow [feature placement](feature-placement.md) when deciding where a component belongs.

## Make settings immediate and predictable

Settings generally update live; introduce Apply/Cancel only when the workflow needs a draft. Keep controls near what they affect, and preserve entered values when validation fails.

Track modules own their settings forms while core provides the shared dialog shell. Reuse first-party settings controls where they fit, without moving track-specific presentation into core.

## Preserve usability in dense layouts

Keep labels visible and icon actions named. Preserve MUI's keyboard and focus behavior, and avoid using color as the only way to distinguish state. On narrow screens, wrap or stack related controls rather than compressing them beyond use.

Product requirements take precedence over these defaults. Existing screens are examples to evaluate, not a reason to repeat an awkward design.
