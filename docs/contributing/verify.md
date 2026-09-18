# Verifying changes

Run `pnpm verify` from the repository root before handing off a PR. It runs the configured formatting, lint, build, and test tasks across the workspace through Turborepo. The first run can be slow. Subsequent runs reuse cached results for unchanged inputs, so changes spanning packages do not require manually selecting each package's checks.

Direct checks are useful while iterating. For example, `pnpm core test` runs core's tests. Use the affected package's configured commands for focused feedback, then use `pnpm verify` for the workspace check before handoff.

## Additional checks

Run `pnpm run doctor` before PR handoff and report relevant React Doctor findings. This is a separate diagnostic pass, not part of `pnpm verify`. Its CI workflow is nonblocking. Distinguish findings caused by the change from existing findings; do not expand a focused contribution into unrelated cleanup.

> Note: the CI and local versions of React Doctor may be out of sync occasionally, and some issues may or may not be reported in either place. Update as needed, and consolidate CI and local results when necessary.

For changes to the Rust conversion tool, also run:

```sh
cargo test --manifest-path tools/gtf-to-big-gene-pred-plus/Cargo.toml --locked
```

CI runs this separately from the workspace tasks. It is not included in `pnpm verify`.

## Formatting

Run `pnpm format` from the repository root before committing and handing off the change. It runs the workspace formatting tasks through Turborepo. For work in one package, use its formatting script, such as `pnpm core format`, or run `pnpm format` from that package's directory. Package scripts format the whole package; there is no need to list changed files individually.

A failed formatting check is work to finish, not just a result to report. Apply the formatter, review the resulting diff, and run `pnpm verify` so CI does not need a follow-up formatting commit.

## Reporting results

Report failures, checks that could not run, and any remaining uncertainty about the changed behavior. Passing automated checks does not establish behavior they do not exercise. Keep PR descriptions focused on the implementation and relevant review limits rather than copying check logs.
