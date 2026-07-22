---
name: react-doctor
description: Use when the user asks to run React Doctor, inspect or triage its diagnostics, compare React health, or understand and configure its rules. Covers project selection, scan scope, findings, and rule configuration; it is not the repository's general verification checklist.
version: "1.3.0"
---

# React Doctor

Scans React codebases for security, performance, correctness, accessibility, and architecture issues. Its diagnostics and 0–100 health score are signals to investigate, not proof that code is correct.

## Choose the scan

Use the repository's installed version. Run a full scan when the user asks for general cleanup or a health assessment:

```bash
pnpm exec react-doctor . --verbose
```

Target an affected package or project when a repository contains multiple projects:

```bash
pnpm exec react-doctor packages/ui-v2 --verbose
```

Use a Git-based scope only when the relevant Git changes are the intended scan boundary:

```bash
pnpm exec react-doctor . --verbose --scope changed --include-untracked
```

`files`, `changed`, and `lines` derive their inputs from Git relative to a base ref. They do not mean files touched during the current agent session. Do not use them when unrelated worktree changes would contaminate the scan.

## Triage findings

1. Inspect errors before warnings.
2. Confirm each diagnostic applies to the code and intended behavior before changing it.
3. Fix diagnostics only when the user asked for code changes or cleanup. Otherwise, report the findings without editing.
4. Avoid unrelated findings unless the user requested a broader cleanup.
5. Rerun the same command after fixes and report the remaining diagnostics and score.

## Command options

| Option                | Purpose                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `[directory]`         | Scan a project directory; defaults to the current directory       |
| `--project <name>`    | Select one or more workspace projects                             |
| `--verbose`           | Show every rule and per-file details                              |
| `--scope full`        | Scan the selected project in full; this is the default            |
| `--scope files`       | Report diagnostics in files changed relative to the Git base      |
| `--scope changed`     | Report new diagnostics relative to the Git base                   |
| `--scope lines`       | Report diagnostics whose source spans touch Git-changed lines     |
| `--include-untracked` | Include ordinary untracked files with a Git-based scope           |
| `--base <ref>`        | Override the base ref used by a Git-based scope                   |
| `--score`             | Output only the numeric score                                     |
| `--no-score`          | Skip the score service, share URL, crash reporting, and telemetry |

## Resources

- `references/explain.md`: explains React Doctor rules and the available configuration controls. Read it when the user asks why a rule fired or wants to disable, enable, or tune rules.
