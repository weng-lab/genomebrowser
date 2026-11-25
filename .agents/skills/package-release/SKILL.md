---
name: package-release
description: Prepare genomebrowser package releases, recommend versions or use maintainer-specified versions, hand off human npm publication, and manage GitHub release drafts or publication when requested. Excludes standalone app deployment.
---

# Package release

Follow [releases](../../../docs/tooling/releases.md).

1. Before editing any release file, show the maintainer the packages in scope, their consumer-facing changes since the last published version, and the proposed versions, and get them confirmed.
2. Prepare and verify the release, then stop at the npm handoff with the exact command, versions, and commit.
3. Draft GitHub releases when asked; publish them only on a separate request after npm succeeded.
