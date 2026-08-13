# BigBed test fixtures

`basic.bb` and `basic-unc.bb` contain the BED6 records in `basic.bed`, indexed with
the synthetic chromosome sizes in `chrom.sizes`. `basic.bb` uses BigBed's normal internal zlib
block compression. `basic-unc.bb` uses uncompressed data blocks.

Install UCSC's `bedToBigBed` utility, then run these exact commands from this directory:

```sh
bedToBigBed -type=bed6 basic.bed chrom.sizes basic.bb
bedToBigBed -type=bed6 -unc basic.bed chrom.sizes basic-unc.bb
```

The committed binaries were generated with the UCSC Kent utility `bedToBigBed v. 2.7` (BigBed
version 4). Their SHA-256 hashes are:

```text
677248b56d6186f4b03bd8a661229fa319ecac4b79488aac8e3fc634079dbc0a  basic.bb
a4120fcca07520ec37c994c934ed414276b0b4ca1e7a26d9ea703477f82496eb  basic-unc.bb
```

Keep `basic.bed` sorted by chromosome and numeric start coordinate. The public API tests decode
both binaries and compare every returned record with this BED source. You can independently decode
either binary with UCSC's `bigBedToBed`, then compare its output with `basic.bed`:

```sh
bigBedToBed basic.bb /tmp/basic.roundtrip.bed
diff -u basic.bed /tmp/basic.roundtrip.bed

bigBedToBed basic-unc.bb /tmp/basic-unc.roundtrip.bed
diff -u basic.bed /tmp/basic-unc.roundtrip.bed
```
