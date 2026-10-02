# Local files

Part of the [architecture](README.md). Status: **Draft**, still being worked out. Decision: [0010](decisions/0010-serve-local-files-over-http.md) (proposed).

## Purpose

A user runs `gb` in a project folder and loads their own BigWig and BigBed files into the browser, without uploading them anywhere. This is a must-have for the local product. It must also work when `gb` runs on a remote server and the browser runs on a laptop (see [remote-access.md](remote-access.md)).

## Constraints from the genome browser

The BigWig and BigBed track modules take an absolute HTTP(S) URL. The server behind it must support byte-range requests with `206 Partial Content`, report correct byte lengths, and not compress the response. A different origin must allow the request through CORS.

The readers fetch only the byte ranges they need: the header, the index, and the blocks for the visible region. Multi-gigabyte files work without loading the whole file.

## Design

The local server serves files from disk over HTTP with range support. The genome browser loads them like any other URL.

```
user picks ~/project/signal/H3K27ac.bw in the workspace
  → POST /api/files { path }      server checks the path is inside an allowed folder,
                                  reads the file header, returns { id, type, chromosomes }
  → workspace adds a bigwig track with url = <origin>/files/<id>
  → the genome browser sends GET /files/<id> with Range: bytes=...
  → server answers 206 with those bytes from disk
```

Because the workspace is served by the same local server, the file URLs are same-origin. No CORS is needed, and the login cookie goes with every request.

### Which folders are allowed

- By default, the folder `gb run` started in.
- More with `gb run --data <dir>`, repeatable, or later from a settings page.
- The server resolves real paths (following symlinks) and refuses anything outside the allowed folders. Paths never come straight from a URL: `/files/<id>` only serves files that were registered first.

### Picking files

The browser can't list the server's disk on its own, so the server provides a small file API:

| Route | Does |
| --- | --- |
| `GET /api/files/browse?dir=` | Lists a folder inside the allowed folders, showing subfolders and supported files |
| `POST /api/files` | Registers a file and returns its id, detected type and chromosome names |
| `GET /files/<id>` | Serves the file with byte ranges |

The workspace shows a file picker built on these routes. Dragging a file from the desktop can't work this way, because the browser only gives the page the file's contents, not its path on the server's disk.

### Detecting the type

Use the extension, then confirm with the file's magic number: BigWig starts with `0x888FFC26`, BigBed with `0x8789F2EB`. The server also reads the chromosome list from the header and warns when the names don't match the assembly, such as `1` versus `chr1`.

### Serving the bytes

- `206 Partial Content` for `Range` requests, `Accept-Ranges: bytes`, exact `Content-Length`.
- No compression on `/files/*`.
- `ETag` and `Last-Modified` from the file's size and modification time, with `Cache-Control: private`.
- If the file changes on disk, its URL changes too (`/files/<id>?v=<mtime>`). The genome browser caches file metadata per URL, so a stale URL would read a changed file with the old index.

### Saving sessions that use local files

Saved sessions must not store `http://127.0.0.1:4100/files/<id>`. The port changes between runs, and over SSH the browser sees a different host. Instead:

- Saved state stores a portable reference, for example `local-file:<id>`.
- The workspace turns it into an absolute URL against the current origin when it loads the session, and back again when it saves.
- The `local_files` table maps each id to the allowed folder and the path inside it, plus size and modification time.

What happens when a session with local-file tracks is saved to the cloud or opened on the cloud site is still open. The current proposal keeps those tracks as references and shows a placeholder wherever the file isn't available, with no automatic upload. See [Local and cloud sessions](sessions-and-data.md#local-and-cloud-sessions) and questions SD-1 to SD-6.

### Agents and local files

- Adding a track from a local file is `external` in [agent permissions](agents-and-tools.md#agent-permissions), because it exposes file contents and names to the agent.
- Proposed tools: `list_local_files` (search the allowed folders for supported files) and `add_track` with a local file id or path.
- ACP agents such as Codex can already read the project with their own tools. The common flow becomes: the user asks Codex to load their H3K27ac signal, Codex finds the file, then calls `add_track`.

### Security

- Every `/files` and `/api/files` request needs the login cookie (see [identity-and-security.md](identity-and-security.md#local-server-security)).
- Only registered files inside allowed folders are served. There is no "serve this path" route.
- File paths and names count as private session data. They aren't logged in full.

## Formats

| Format | Status |
| --- | --- |
| BigWig, BigBed | First. The library already reads them through range requests. |
| bedGraph, BED (plain text) | Later. Either convert to BigWig or BigBed on load (needs `bedGraphToBigWig` or a JavaScript equivalent), or parse small files whole. |
| BAM, CRAM, VCF with an index | Later. Needs track modules and serving the index file next to the data file. |

## Cloud

The cloud site can't read a user's disk. Later options, each needing its own design:

- Upload to cloud storage, then serve from there.
- Keep the file in the browser (picked or dropped) and read it from a `File` object. This needs the genome browser library to accept a data source that isn't a URL.

## Open questions

Each question has a default. Build with the default unless it changes.

### LF-1. Should agents load files without asking?

Loading a file is `external`, which the default mode denies.

- **Ask in local mode (default).** Loading project files is the main local use case, and asking keeps the user in control.
- **Deny until the user changes the mode.** Safest, but the main flow ("Codex, load my signal") fails out of the box.
- **Allow in local mode.** Smoothest, but any connected agent can read file names and contents in the allowed folders.

### LF-2. How does the server identify a file?

This decides whether a saved track still works on another machine or after files move.

- **Path relative to the project folder, plus size and modification time as a fingerprint (default).** The same session works on a laptop and a server that both have the project. Moving a file breaks the track, and the fingerprint catches a different file at the same path.
- **A local id only.** Simple, but only works on the machine that registered the file.
- **A content hash.** Survives moves and renames, but hashing multi-gigabyte files is slow.

### LF-3. Can users register a whole folder at once?

- **Yes, as "add every BigWig in this folder" from the picker (default).**
- **One file at a time.** Simpler, slow for projects with dozens of tracks.

### LF-4. Watch folders for new files, or only look when the picker opens?

- **Look when the picker opens (default).** No background work, and nothing to go wrong on network file systems.
- **Watch.** New files appear on their own, but file watching is unreliable on NFS, which clusters often use.

### LF-5. Can the picker add a new allowed folder?

- **Yes, with a confirmation in the workspace (default).** Users don't need to restart `gb` with `--data`.
- **Only through `--data`.** The set of readable folders is fixed at launch, which is easier to reason about for security.

### LF-6. Plain-text formats (bedGraph, BED): convert or parse?

- **Convert to BigWig or BigBed on load (default).** Range reads keep working for large files, but conversion needs a tool or a JavaScript converter.
- **Parse small files whole in the browser.** No tools needed, but only practical for small files.
