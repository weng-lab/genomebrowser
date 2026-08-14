# BigWig test fixtures

`basic.bw` and `basic-unc.bw` contain the 111 bedGraph records in
`basic.bedGraph`, indexed with the synthetic chromosome sizes in `chrom.sizes`.
`basic.bw` uses normal internal zlib data-block compression. `basic-unc.bw`
uses uncompressed data blocks. Both files contain the same unzoomed values and
stored zoom summaries.

The source deliberately includes:

- `chr1` and `chr2`, including records at both chromosome starts and ends;
- sparse gaps, including `chr1:2425-5000` and `chr1:7440-10000`;
- the intervals `chr1:970-1030` and `chr1:1970-2030`, which overlap the lower
  and upper boundaries of a `chr1:1000-2000` query;
- positive, negative, integer, and fractional values from `-9.5` through `9`;
- enough records and genomic span for four actual converter-generated zoom
  levels.

The intentionally small `-blockSize=4` and `-itemsPerSlot=8` settings keep the
fixtures tiny while placing the 111 source records in 14 primary data blocks.
They are fixture-generation settings, not recommended production defaults.

## Tool provenance

The committed binaries were generated and inspected with the official UCSC
Kent command-line utilities downloaded from
<https://hgdownload.soe.ucsc.edu/admin/exe/linux.x86_64/> on 2026-08-13.
`bedGraphToBigWig` reports `v 2.10` and BBI version 4. The exact tool binaries
used had these SHA-256 hashes:

```text
1a1527cf364e1e572a81c7284fc9ccd2b3690b5896baa5b57399864f85ad7771  bedGraphToBigWig
1fb4e7edbfbcfe79edd8b27af0c1ac29277b1f65f28a88f57558bf903da5b8b0  bigWigInfo
22f22e03e6c91561e2bdfa7f967e6e8a60ba7a9b3a7b09ef051162e7bcb90bed  bigWigToBedGraph
4e05a2eb93165dff250a44b5fd89b4ac2460cfb2dc5a170f7ab8c668542c9867  bigWigSummary
```

You can retrieve the same tool names from the official distribution directory:

```sh
for tool in bedGraphToBigWig bigWigInfo bigWigToBedGraph bigWigSummary; do
  curl -fsSLO "https://hgdownload.soe.ucsc.edu/admin/exe/linux.x86_64/$tool"
  chmod +x "$tool"
done
sha256sum bedGraphToBigWig bigWigInfo bigWigToBedGraph bigWigSummary
```

## Regeneration

Keep `basic.bedGraph` sorted by chromosome and numeric start coordinate. From
this directory, regenerate both binaries with:

```sh
bedGraphToBigWig -blockSize=4 -itemsPerSlot=8 \
  basic.bedGraph chrom.sizes basic.bw
bedGraphToBigWig -blockSize=4 -itemsPerSlot=8 -unc \
  basic.bedGraph chrom.sizes basic-unc.bw
```

The committed fixture inputs and outputs have these sizes and SHA-256 hashes:

```text
basic.bedGraph   2142 bytes  6c7efe5a9263c09f2ad27f5a689f3acb91cbf793676f5c3f715b959b37679bed
chrom.sizes        21 bytes  e58733cee4754f9f3492fb1b69be9ad0b7b0630e86dea2b55d2058d1410d816a
basic.bw          3721 bytes  0d28870fb5ea1fa2d70495693be1861b662e52d79c6f3d16305cb37ca42f8d4b
basic-unc.bw      4908 bytes  e49672a6eceb71c92509279217cf74f7d58c5140c565447dffead54163bce688
```

## Trusted UCSC inspection

Run these commands to verify the BBI version, compression mode, chromosomes,
and declared zoom levels:

```sh
bigWigInfo -chroms -zooms basic.bw
bigWigInfo -chroms -zooms basic-unc.bw
```

The trusted UCSC output is:

```text
version: 4
isCompressed: yes
isSwapped: 0
primaryDataSize: 1,185
primaryIndexSize: 660
zoomLevels: 4
	656	450
	2624	224
	10496	84
	41984	62
chromCount: 2
	chr1 0 12000
	chr2 1 9000
basesCovered: 4,640
mean: 0.287042
min: -9.500000
max: 9.000000
std: 4.941294
version: 4
isCompressed: no
isSwapped: 0
primaryDataSize: 1,676
primaryIndexSize: 660
zoomLevels: 4
	656	676
	2624	292
	10496	100
	41984	68
chromCount: 2
	chr1 0 12000
	chr2 1 9000
basesCovered: 4,640
mean: 0.287042
min: -9.500000
max: 9.000000
std: 4.941294
```

The `isCompressed` lines inspect the encoded BBI header's uncompression-buffer
field; they verify the data-block modes rather than inferring them from the
generation flags or file names.

Decode both files with UCSC tooling and compare every unzoomed value with the
committed source:

```sh
bigWigToBedGraph basic.bw /tmp/basic.roundtrip.bedGraph
diff -u basic.bedGraph /tmp/basic.roundtrip.bedGraph

bigWigToBedGraph basic-unc.bw /tmp/basic-unc.roundtrip.bedGraph
diff -u basic.bedGraph /tmp/basic-unc.roundtrip.bedGraph
```

Both `diff` commands exit 0 with no output.

For a trusted zoom-backed regional summary, UCSC `bigWigSummary` reports the
following identical results for both fixtures:

```sh
for file in basic.bw basic-unc.bw; do
  for type in mean min max coverage std; do
    bigWigSummary -type="$type" "$file" chr1 0 12000 4
  done
done
```

```text
-0.0465686	-0.269617	0.0744751	-0.231175
-8	-8	-8	-9.5
7	7	7	7
0.34	0.141333	0.192333	0.276667
4.53093	4.74146	5.02963	4.81667
-0.0465686	-0.269617	0.0744751	-0.231175
-8	-8	-8	-9.5
7	7	7	7
0.34	0.141333	0.192333	0.276667
4.53093	4.74146	5.02963	4.81667
```

## Stored zoom-record inspection

`inspect.py` is a standard-library-only, fixture-local inspector. It reads the
published BBI common and zoom-header layouts, inflates concatenated zlib streams
when the header declares compression, and decodes the stored 32-byte zoom
records. It does not import or exercise reader package code. This command shows
representative records from the first converter-declared level:

```sh
python3 inspect.py basic.bw 656 4
python3 inspect.py basic-unc.bw 656 4
```

Both commands report the same encoded records; only `dataBlocks` differs:

```text
file=basic.bw version=4 dataBlocks=compressed
zoomLevels=656,2624,10496,41984
reduction=656 recordCount=21
chromId	start	end	validCount	min	max	sum	sumSquares	mean
0	0	656	281	-8.0	7.0	-6.25	5180.3125	-0.02224199288256228
0	656	1312	236	-8.0	7.0	316.25	6764.0625	1.340042372881356
0	1312	1968	283	-8.0	7.0	36.25	7031.875	0.12809187279151943
0	1970	2626	220	-4.5	2.75	-393.75	1945.3125	-1.7897727272727273
```

`chromId` 0 is `chr1`, as independently reported by `bigWigInfo -chroms`.
`validCount`, `min`, `max`, `sum`, and `sumSquares` are stored fields. The final
`mean` column is derived by the inspector as `sum / validCount`.
