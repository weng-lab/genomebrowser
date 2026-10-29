# Interface design

The browser is primarily embedded in scientific websites. Shared UI should fit those hosts: compact controls, readable data, consistent interactions. Favor clear grouping and typography over decorative panels. Keep dense workflows usable without shrinking labels or controls beyond use.

## Fit the host

Use MUI for application controls. Draw colors, spacing, and typography from the active theme. Do not impose global resets or a shared theme on the host. Scientific colors belong to track configuration, independent of chrome styling.

The UI package serves embedding applications. Archived standalone UI under `legacy/` is not a current product target. Follow [feature placement](feature-placement.md) when deciding where a component belongs.

## Settings

Settings generally update live; introduce Apply/Cancel only when the workflow needs a draft. Keep controls near what they affect, and preserve entered values when validation fails. Track modules own their settings forms; core provides the shared dialog shell.

## Dense layouts

Keep labels visible and name icon actions. Preserve MUI keyboard and focus behavior. Do not use color as the only state signal. On narrow screens, wrap or stack rather than compressing past usability.

Product requirements override these defaults. Existing screens are examples to evaluate, not templates to copy awkwardly.
