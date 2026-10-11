# Genome browser playground

This private Next.js App Router application is the repository's development playground. It contains experimental routes and custom browser setups that do not belong in the standalone product or publishable packages.

The home page at `/` shows an hg38 browser with one GENCODE 40 comprehensive Gene track in merged display. Pan by dragging, use the zoom buttons, and open track settings to change the display or switch to the basic annotation variant.

The files under `examples/` preserve the former core and UI package demos and their fixtures. They are intentionally not connected to routes. Each `App.tsx` is already a client component, so a temporary route can import it directly.

The playground resolves every public workspace package entry directly to its TypeScript source. Add new public track subpaths to `tsconfig.json`; both Turbopack and TypeScript use those paths.

From the repository root, run:

```sh
pnpm playground dev
```

Automation agents must not start the development server.

The home page includes an HG00096 hg38 BAM track from [IGV's test data](https://github.com/igvteam/igv.js/tree/de59761b65419195e18f3f26c7ec71531883dea2/test/data/cram). The initial region is `chr8:128749000–128751000` (2,000 bp), containing both sample alignments. BAM and BAI URLs are pinned to that commit and support cross-origin byte-range requests. Both tracks share the hg38 browser and navigation. BAM defaults to pack; settings expose dense, squish, pack, and full. This small fixture has only two reads, so panning beyond them leaves the BAM track empty.

The BAM track uses UCSC's hg38 2bit reference through `config.sequenceUrl`. Change or clear **Reference 2bit URL** in BAM settings and select **Set** to apply it. The playground BAM is user-owned so its source fields are editable. Reference sequence is fetched at base-level zoom (at least 8 pixels per base); pack and full displays use it to highlight mismatches.
