# Reader API reference

Import all runtime APIs and types from `@weng-lab/genomic-reader`. The package has one public entry point. Each reader API is documented with its related types.

## Browse by area

- [Regional reading](regionalReading/README.md)
- [BigWig signal](bigWig/README.md)
- [BigBed annotations](bigBed/README.md)
- [BAM alignments](bam/README.md)
- [TwoBit sequence](twoBit/README.md)
- [Chromosome sizes](chromSizes/README.md)
- [Cytobands](cytobands/README.md)

## Public export index

Every public export has a canonical destination below. File methods are documented with their file type.

### Regional reading

| Exports         | Reference                                                        |
| --------------- | ---------------------------------------------------------------- |
| `GenomicFile`   | [Regional reading](regionalReading/genomicFile.md#genomicfile)   |
| `GenomicRegion` | [Regional reading](regionalReading/genomicFile.md#genomicregion) |
| `GenomicRecord` | [Regional reading](regionalReading/genomicFile.md#genomicrecord) |
| `ReadOptions`   | [Regional reading](regionalReading/genomicFile.md#readoptions)   |

### BigWig signal

| Exports                                                                         | Reference                                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `createBigWigFile`, `BigWigFile`                                                | [BigWig signal](bigWig/bigWig.md#factory-and-file-methods) |
| `BigWigFileOptions`, `BigWigRecord`, `BigWigValueRecord`, `BigWigSummaryRecord` | [BigWig signal](bigWig/bigWig.md#public-bigwig-types)      |

### BigBed annotations

| Exports              | Reference                                                 |
| -------------------- | --------------------------------------------------------- |
| `createBigBedFile`   | [BigBed annotations](bigBed/bigBed.md#createbigbedfile)   |
| `BigBedFileOptions`  | [BigBed annotations](bigBed/bigBed.md#bigbedfileoptions)  |
| `BigBedFile`         | [BigBed annotations](bigBed/bigBed.md#bigbedfile)         |
| `BigBedRecord`       | [BigBed annotations](bigBed/bigBed.md#bigbedrecord)       |
| `bed3Schema`         | [BigBed annotations](bigBed/bigBed.md#bed3schema)         |
| `BigBedParseError`   | [BigBed annotations](bigBed/bigBed.md#bigbedparseerror)   |
| `BigBedParseContext` | [BigBed annotations](bigBed/bigBed.md#bigbedparsecontext) |

### BAM alignments

| Exports                                | Reference                                                     |
| -------------------------------------- | ------------------------------------------------------------- |
| `createBamFile`, `BamFileOptions`      | [BAM alignments](bam/bam.md#createbamfile-and-bamfileoptions) |
| `BamFile`, `BamRecord`                 | [BAM alignments](bam/bam.md#bamfile-and-bamrecord)            |
| `BamHeader`, `BamReference`            | [BAM alignments](bam/bam.md#the-header)                       |
| `BamCigarOperation`, `BamCigarSegment` | [BAM alignments](bam/bam.md#cigar)                            |

### TwoBit sequence

| Exports                                 | Reference                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `createTwoBitFile`, `TwoBitFileOptions` | [TwoBit sequence](twoBit/twoBit.md#createtwobitfile-and-twobitfileoptions) |
| `TwoBitFile`, `TwoBitRecord`            | [TwoBit sequence](twoBit/twoBit.md#twobitfile-and-twobitrecord)            |

### Chromosome sizes

| Exports                                                                    | Reference                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| `parseChromSizes`, `readChromSizes`, `ChromSizes`, `ReadChromSizesOptions` | [Chromosome sizes](chromSizes/chromSizes.md#api) |

### Cytobands

| Exports                                                               | Reference                               |
| --------------------------------------------------------------------- | --------------------------------------- |
| `parseCytobands`, `readCytobands`, `Cytoband`, `ReadCytobandsOptions` | [Cytobands](cytobands/cytobands.md#api) |

Return to [Parent documentation](../README.md).
