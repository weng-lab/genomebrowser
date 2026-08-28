# GTF to BigGenePred-plus

This standalone Rust utility converts a GTF annotation directly to an indexed BigBed. It emits the standard BigGenePred BED12+8 fields followed by `tags` and `attributes` fields. The exact embedded AutoSQL declaration is in [`schema/bigGenePredPlusV1.as`](schema/bigGenePredPlusV1.as).

## Build and run

Run commands from this directory:

```sh
cargo build --release
./target/release/gtf-to-big-gene-pred-plus \
  annotation.gtf.gz \
  --chrom-sizes genome.chrom.sizes \
  --output annotation.bb
```

The GTF input may be plain text or gzip-compressed with a `.gz` suffix. The chromosome sizes file is required and must contain exactly two whitespace-separated columns per line: chromosome name and positive length. The converter first tries an exact chromosome-name match. When a GTF name does not start with `chr` and has no exact match, it also tries the name with a `chr` prefix. For example, GTF chromosome `1` matches a `chr1` sizes entry and is written to the BigBed as `chr1`. Other naming differences, including Ensembl-to-UCSC alternate-locus names, still require matching names in the chromosome sizes file. The converter rejects every GTF feature on an unknown chromosome or outside the declared length.

## Input contract

The converter deliberately rejects ambiguous annotations instead of guessing:

- Each output transcript needs one `transcript` record with exactly one `transcript_id` and `gene_id`.
- Each transcript needs at least one nonoverlapping `exon`. Its first and last exon bounds must match the transcript record.
- `exon`, `CDS`, `start_codon`, and `stop_codon` records need exactly one `transcript_id`. Their chromosome, strand, and coordinates must match the parent transcript.
- A CDS needs phase `0`, `1`, or `2` and must fit inside one exon. At most one CDS record may map to an exon. A start or stop codon may span multiple records across exons, but its records must total three bases.
- Only `gene`, `transcript`, `exon`, `CDS`, `start_codon`, `stop_codon`, `Selenocysteine`, `UTR`, `five_prime_utr`, and `three_prime_utr` feature types are accepted. Gene, UTR, and Selenocysteine records do not create blocks.
- Strands must be `+` or `-`, and all text written to BED must be valid UTF-8 without tabs or line breaks.

Output records are sorted by chromosome, start, end, and remaining fields before BigBed writing. The output does not depend on GTF transcript order.

## Field mapping

`name` is `transcript_id`, and `name2` is `transcript_name` with an ID fallback. `geneName`, `geneName2`, and `geneType` come from `gene_id`, `gene_name`, and `gene_type`. Score and reserved are `0`. The `tags` field joins every transcript-line `tag` value with commas in source order and is empty when no tags are present.

Coding thick bounds cover the CDS plus any start- and stop-codon records. A noncoding transcript uses `thickStart = thickEnd = chromEnd`. Start and end status values are `cmpl` when the corresponding biological start or stop codon exists and `incmpl` when it does not. The converter maps those biological statuses onto genomic low and high fields by strand, so a minus-strand stop codon controls `cdsStartStat` and its start codon controls `cdsEndStat`. Noncoding statuses are `none`.

The JSON field comes only from the transcript line. It keeps first-seen key order and repeated-value order. A key with one value is a JSON string; a repeated key becomes a JSON array. The typed attributes `gene_id`, `gene_name`, `gene_type`, `transcript_id`, `transcript_name`, and `transcript_type` are excluded, as is every `tag`. Other attributes, including `gene_biotype` and `transcript_biotype`, remain in JSON. `serde_json` writes compact JSON with deterministic escaping.

## Exon-frame convention

`exonFrames` converts each CDS phase to a UCSC exon frame with `(3 - phase) % 3` and uses `-1` for noncoding exons. The array is in transcription order. The converter therefore reverses the genomic exon frame list for minus-strand transcripts while leaving BED block arrays in genomic order.

This convention is intentional, but it does not match Kent tools. Kent's BigGenePred schema describes frame values in the direction of transcription, while Kent-generated files conventionally keep the array aligned to genomic-order blocks. Consumers that assume Kent's genomic-order frame arrays will associate minus-strand frames with the wrong blocks unless they account for this tool's convention.

## Tests

```sh
cargo fmt --check
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo build --release
```

The checked-in fixture covers incomplete plus- and minus-strand coding transcripts, a noncoding transcript, repeated tags and attributes, absent tags, phase conversion, codon thick bounds, and minus-strand frame reversal. The integration test writes a BigBed with `bigtools` and queries its chromosome index with `BigBedRead`, including a transcript that starts before the requested viewport.

## Dependencies

The converter uses `noodles-gtf` for strict GTF parsing and `flate2` for gzip input. `bigtools` writes the indexed BigBed directly and reads it in integration tests. `serde_json` produces compact deterministic metadata, `clap` defines the CLI, and `tokio` supplies the runtime required by the `bigtools` writer. Exact versions are locked in `Cargo.lock`.
