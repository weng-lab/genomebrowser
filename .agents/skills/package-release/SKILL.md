---
name: package-release
description: Prepare genomebrowser package releases, recommend versions or use maintainer-specified versions, hand off human npm publication, and manage GitHub release drafts or publication when requested. Excludes standalone app deployment.
---

# Package release

Read [release guidance](../../../docs/tooling/releases.md) and [ADR 0005](../../../docs/adr/0005-independent-package-releases.md). That guidance is authoritative.

1. Establish stage and package scope. If packages or a coordinated release were not specified, ask before editing release files. A version alone is not scope.
2. Present affected packages, consumer-facing changes, and versions. Resolve channel/version uncertainty before updating files.
3. For authorized preparation: versions, needed dependency minimums, lockfile, docs; verify and inspect packed artifacts; dry-run the selection. Follow [verify](../../../docs/contributing/verify.md) and [schemas](../../../docs/tooling/collection-schemas.md).
4. Prepare per-package changelogs and GitHub drafts when requested ([contributing](../../../docs/contributing/README.md) for commits/PRs).
5. Hand the exact npm publish command to the human. After they publish, verify read-only and report partial failures.
6. Publish GitHub releases only on separate explicit request after npm succeeds.
