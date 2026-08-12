# BigBed test fixture

`basic.bb` is a small BED6 BigBed file used by automated reader tests. Its source records and synthetic chromosome sizes are committed alongside it so the binary can be reproduced.

Install UCSC's `bedToBigBed` utility, then regenerate the fixture from this directory:

```sh
bedToBigBed -type=bed6 basic.bed chrom.sizes basic.bb
```

The input must remain sorted by chromosome and start coordinate.
