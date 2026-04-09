# Slice 1: Folder-Owned Track Creation

## Dependencies

None.

## Description

Move row-to-track creation out of the test harness and into the folder definitions themselves. Each folder family should expose a consistent `createTrack(row, options)` path so folder behavior is self-contained and no central switch on folder type or folder ID is needed.

## Expected Behaviors Addressed

- Adding a new folder does not require editing a central folder-type switch.
- Folder behavior is self-contained.

## Acceptance Criteria

- [ ] Folder definitions expose a required `createTrack(row, options)` API.
- [ ] Genes, biosamples, MOHD, and other-tracks create the same effective browser tracks as before.
- [ ] The old test-harness-owned folder-specific generation path is no longer the source of truth.

## QA

1. Run the `packages/ui` vitest suite for folder track creation.
2. Verify each folder family has at least one business-logic test covering track creation.
3. Open the local UI test harness and confirm the default managed tracks still render with the same track types and labels as before.

---

_Appended after execution._

## Completion

**Built:** Added a required folder-level `createTrack(row, options)` contract, implemented track creation modules for genes, biosamples, and other-tracks, aligned MOHD to the same signature, and updated the UI test harness to create tracks through the folder object instead of the central `generateTrack()` switch.

**Decisions:** `createTrack` now takes a `CreateTrackOptions` object with a required `assembly` field and room for future extra options. Folder-specific track creation remains pure and does not include interaction callbacks. The test harness still injects callbacks after track creation. Standalone `createMohdTrack` is no longer re-exported from `src/lib.ts`; the folder contract is now the primary source of truth.

**Deviations:** Automated tests were kept narrower than the original runtime-folder QA idea because importing full folder definitions pulls in DataGrid CSS and broader UI dependencies. Instead, Vitest covers the pure per-folder track-creation helpers, and the required folder contract is validated by the successful `packages/ui` build/typecheck. I did not auto-run the local UI harness because the repo instructions explicitly say not to run `pnpm run dev`.

**Files:** Modified `packages/ui/src/TrackSelect/Folders/types.ts`, `packages/ui/src/TrackSelect/Folders/genes/shared/createFolder.ts`, `packages/ui/src/TrackSelect/Folders/biosamples/shared/createFolder.ts`, `packages/ui/src/TrackSelect/Folders/other-tracks/shared/createFolder.ts`, `packages/ui/src/TrackSelect/Folders/mohd/shared/createFolder.ts`, `packages/ui/src/TrackSelect/Folders/mohd/shared/toTrack.ts`, `packages/ui/src/lib.ts`, `packages/ui/test/main.tsx`, `packages/ui/package.json`, and `packages/ui/vitest.config.ts`. Added `packages/ui/src/TrackSelect/Folders/genes/shared/toTrack.ts`, `packages/ui/src/TrackSelect/Folders/biosamples/shared/toTrack.ts`, `packages/ui/src/TrackSelect/Folders/other-tracks/shared/toTrack.ts`, `packages/ui/test/folders.test.ts`, and `packages/ui/test/mocks/logo-test.tsx`.

**Notes for next slice:** The concrete contract for later slices is now `folder.createTrack(row, { assembly, ...extras })`. The current managed ID remains the existing row ID, and `main.tsx` now assumes folder row IDs line up with the inserted managed track IDs. Slice 2 should build startup restoration around those existing row IDs unless there is a strong reason to introduce a more explicit managed ID format. Verified commands: `pnpm --filter @weng-lab/genomebrowser-ui test` and `pnpm --filter @weng-lab/genomebrowser-ui build`.
