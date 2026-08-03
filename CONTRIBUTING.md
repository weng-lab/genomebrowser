# Contributing

Keep contributions focused and easy to review. Include documentation, scripts,
or cleanup only when they are necessary for the change.

When creating or updating an issue or pull request, apply relevant labels and
assign the responsible person when known. Leave uncertain metadata unset rather
than guessing.

## Commits

Write a short, specific commit message in the imperative mood. Describe the
outcome without a category prefix.

```text
Fix track error message layout
```

Avoid vague messages such as `clean up` or `changes`.

## Pull requests

Use a short, specific title in the same style as a commit message. In the
summary, state what changed and why. If hands-on review would be useful, include
brief manual verification steps. End the description with `Closes #123` when
the pull request resolves an issue.

Automated checks belong in CI and do not need to be repeated in the pull
request description.

Before requesting review or handing off a pull request, update its description
and metadata to reflect the final scope.

## Issues

State the desired outcome first, then include only the context, constraints, or
blockers needed to understand the work. Use the bug report template when
reporting incorrect behavior.
