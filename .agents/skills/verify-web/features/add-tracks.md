# Add custom tracks

Add custom tracks lets a user paste or upload hosted BigWig, BigBed, BigGenePred, or BAM URLs (or UCSC track lines), review and edit inferred titles, types, colors, visibility, and metadata, see clear errors for unsupported or unreachable files, and add validated tracks to the open session.

## Sub-features

- `add-tracks-parse-errors` rejects empty input, non-HTTP(S) URLs, or malformed UCSC track lines with per-line error messages before review.
- `add-tracks-review` parses valid URLs or track lines into editable rows showing inferred title, type, color, and metadata fields.
- `add-tracks-validation-failure` checks remote files when adding, adds none if any file fails, and shows the failure reason on the failing row with a `Remove <n> failed row(s)` action.
- `add-tracks-success` adds valid remote tracks to the browser, renders them below existing tracks, and persists them in the saved session.

## How to get to it (user POV)

- Open a session at `/browser/<id>` and click `Add tracks` in the browser toolbar.
- Paste one or more URLs or UCSC track lines into `URLs or track lines`, or click `Upload a file` to load a `.txt` or `.csv` list.
- Click `Review`, adjust any row fields (`URL`, `Title`, `Type`, `Visibility`, `Color`, `BED columns` / `BAI index URL`, metadata), and click `Add <n> track(s)`.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is healthy (`verify-web.mjs doctor` passes) and a fresh `hg38` session is open at `/browser/<id>`.
- Outbound HTTPS access to `downloads.wenglab.org` (or a reachable test BigWig/BigBed URL) is available for the success path.

- **Open dialog and check invalid input.** Click `Add tracks`: `verify-web.mjs browser find role button click --name "Add tracks"`. Confirm the `Add tracks` dialog opens with `Review` disabled while empty. Paste an unsupported plain-text BED URL (`verify-web.mjs browser find role textbox fill --name "URLs or track lines" "https://example.test/sample.bed"`) and click `verify-web.mjs browser find role button click --name "Review"`. Click `Add 1 track` (`verify-web.mjs browser find role button click --name "Add 1 track"`). Confirm the dialog stays open, the row displays an `UNSUPPORTED_FORMAT` / `bedToBigBed` error, and `Remove 1 failed row` appears.
- **Return to text and review a valid track.** Click `verify-web.mjs browser find role button click --name "Back to text"`. Paste a real BigBed URL (for example the known Weng Lab cCRE BigBed `https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed`): `verify-web.mjs browser find role textbox fill --name "URLs or track lines" "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed"`. Click `verify-web.mjs browser find role button click --name "Review"`. Confirm one row labeled `Track 1` appears with inferred type `From the URL: BigBed` and editable `Title`.
- **Customize title and add.** Update the row title (`verify-web.mjs browser find role textbox fill --name "Title" "Verify Custom cCREs"`), then click `verify-web.mjs browser find role button click --name "Add 1 track"`. The button briefly reads `Checking files…`, then the dialog closes once file headers validate.
- **Confirm rendering and persistence.** Wait for `All changes saved` (`verify-web.mjs browser wait --text "All changes saved"`) and track loading (`verify-web.mjs browser wait --fn "!document.querySelector('[role=\"progressbar\"], svg animateTransform[type=\"rotate\"]')"`). Confirm `Verify Custom cCREs` appears in the browser tracks and that session track count increased by 1 in `Session details` (or after reloading the page).
- **Proof.** Capture screenshots of the review error state and the browser after adding the custom track: `verify-web.mjs screenshot add-tracks/validation-error`, `verify-web.mjs screenshot add-tracks/added`, and `verify-web.mjs snapshot add-tracks/added`.

## Gotchas

- Adding tracks is atomic: if any row in a batch fails validation, zero tracks are added until the failing row is fixed or removed.
- BigBed rows inspect the remote file's header after typing pauses briefly to populate `BED columns` (`From the file's header: <preset>`). Wait briefly if asserting that label.
- Closing the dialog while `Checking files…` is active cancels the check and adds nothing.
- If `downloads.wenglab.org` is unreachable from the test environment, report `add-tracks-success` as blocked by network reachability rather than weakening the file check.
