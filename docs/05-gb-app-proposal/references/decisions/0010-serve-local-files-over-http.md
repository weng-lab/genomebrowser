# 0010. Serve local files over HTTP from the local server

Proposed 2026-10-01. Not final yet.

## Why this came up

Local users must be able to load BigWig and BigBed files from their own disk, including when `gb` runs on a remote server. The genome browser's track modules load data from an HTTP(S) URL with byte-range support.

## What we chose

The local server serves registered files from allowed folders at `/files/<id>`, with byte-range support. The workspace adds tracks pointing at those URLs. Saved sessions store a portable `local-file:<id>` reference instead of an absolute URL.

## Other options

- **Read files in the browser** through a file picker or drag and drop. Needs the library to accept non-URL data sources, and doesn't work when the files are on a remote server and the browser is on a laptop.
- **Copy or upload files into the app.** Slow and wasteful for multi-gigabyte files that the browser only reads small parts of.
- **Serve whole folders by path.** Simpler, but a URL could then reach any file, and path tricks become an attack surface.

## What this means

- No changes to the genome browser library. Any range-readable format works.
- Works the same over SSH, because the server reads its own disk.
- The server needs a file picker API, path checks, and a `local_files` table.
- Tracks from local files only load on the machine that has the files.
