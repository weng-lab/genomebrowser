use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

use anyhow::{Context, Result, anyhow, bail, ensure};
use bigtools::beddata::BedParserStreamingIterator;
use bigtools::{BedEntry, BigBedWrite};
use flate2::read::MultiGzDecoder;
use noodles_gff::feature::record::{Phase, Strand as GffStrand};
use noodles_gtf as gtf;
use serde_json::{Map, Value};

pub const AUTOSQL: &str = include_str!("../schema/bigGenePredPlusV1.as");

const TYPED_ATTRIBUTES: &[&str] = &[
    "transcript_id",
    "transcript_name",
    "transcript_type",
    "gene_id",
    "gene_name",
    "gene_type",
    "tag",
];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Strand {
    Plus,
    Minus,
}

impl Strand {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Plus => "+",
            Self::Minus => "-",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Interval {
    start: u32,
    end: u32,
}

impl Interval {
    fn contains(self, other: Self) -> bool {
        self.start <= other.start && other.end <= self.end
    }
}

#[derive(Debug)]
struct Cds {
    interval: Interval,
    phase: i32,
}

#[derive(Debug)]
struct Transcript {
    chrom: String,
    span: Interval,
    strand: Strand,
    transcript_id: String,
    transcript_name: String,
    transcript_type: String,
    gene_id: String,
    gene_name: String,
    gene_type: String,
    tags: String,
    attributes_json: String,
    exons: Vec<Interval>,
    cds: Vec<Cds>,
    start_codons: Vec<Interval>,
    stop_codons: Vec<Interval>,
}

#[derive(Debug)]
struct ChildFeature {
    transcript_id: String,
    chrom: String,
    strand: Strand,
    kind: ChildKind,
    interval: Interval,
    phase: Option<i32>,
}

#[derive(Clone, Copy, Debug)]
enum ChildKind {
    Exon,
    Cds,
    StartCodon,
    StopCodon,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BedRecord {
    pub chrom: String,
    pub start: u32,
    pub end: u32,
    pub rest: String,
}

pub fn run(input: &Path, chrom_sizes_path: &Path, output: &Path) -> Result<()> {
    let chrom_sizes = read_chrom_sizes(chrom_sizes_path)?;
    let input_reader = open_input(input)?;
    let records = convert_gtf(input_reader, &chrom_sizes)?;
    write_bigbed(output, chrom_sizes, records)
}

fn open_input(path: &Path) -> Result<Box<dyn BufRead>> {
    let file =
        File::open(path).with_context(|| format!("failed to open GTF {}", path.display()))?;
    let reader: Box<dyn Read> = if path.extension().is_some_and(|extension| extension == "gz") {
        Box::new(MultiGzDecoder::new(file))
    } else {
        Box::new(file)
    };
    Ok(Box::new(BufReader::new(reader)))
}

pub fn read_chrom_sizes(path: &Path) -> Result<HashMap<String, u32>> {
    let file = File::open(path)
        .with_context(|| format!("failed to open chromosome sizes {}", path.display()))?;
    let mut sizes = HashMap::new();

    for (index, line) in BufReader::new(file).lines().enumerate() {
        let line_number = index + 1;
        let line = line.with_context(|| {
            format!(
                "failed reading chromosome sizes {} at line {line_number}",
                path.display()
            )
        })?;
        let mut fields = line.split_whitespace();
        let chrom = fields
            .next()
            .ok_or_else(|| anyhow!("empty chromosome sizes line {line_number}"))?;
        let size_text = fields
            .next()
            .ok_or_else(|| anyhow!("missing size at chromosome sizes line {line_number}"))?;
        ensure!(
            fields.next().is_none(),
            "expected two columns at chromosome sizes line {line_number}"
        );
        let size: u32 = size_text.parse().with_context(|| {
            format!("invalid size {size_text:?} at chromosome sizes line {line_number}")
        })?;
        ensure!(size > 0, "zero size at chromosome sizes line {line_number}");
        ensure!(
            sizes.insert(chrom.to_owned(), size).is_none(),
            "duplicate chromosome {chrom:?} at chromosome sizes line {line_number}"
        );
    }

    ensure!(!sizes.is_empty(), "chromosome sizes file is empty");
    Ok(sizes)
}

pub fn convert_gtf<R: BufRead>(
    input: R,
    chrom_sizes: &HashMap<String, u32>,
) -> Result<Vec<BedRecord>> {
    let mut reader = gtf::io::Reader::new(input);
    let mut transcripts = HashMap::<String, Transcript>::new();
    let mut children = Vec::<ChildFeature>::new();

    for (index, result) in reader.lines().enumerate() {
        let line_number = index + 1;
        let line = result.with_context(|| format!("failed to read GTF line {line_number}"))?;
        let Some(record_result) = line.as_record() else {
            continue;
        };
        let record = record_result.with_context(|| format!("invalid GTF line {line_number}"))?;
        let chrom = text(record.reference_sequence_name(), line_number, "chromosome")?;
        let chrom_size = *chrom_sizes
            .get(&chrom)
            .ok_or_else(|| anyhow!("unknown chromosome {chrom:?} at GTF line {line_number}"))?;
        let start = usize::from(
            record
                .start()
                .with_context(|| format!("invalid start at GTF line {line_number}"))?,
        );
        let end = usize::from(
            record
                .end()
                .with_context(|| format!("invalid end at GTF line {line_number}"))?,
        );
        let start = u32::try_from(start - 1)
            .with_context(|| format!("start is too large at GTF line {line_number}"))?;
        let end = u32::try_from(end)
            .with_context(|| format!("end is too large at GTF line {line_number}"))?;
        ensure!(
            start < end && end <= chrom_size,
            "coordinates {chrom}:{}-{end} exceed chromosome size {chrom_size} at GTF line {line_number}",
            start + 1
        );
        let interval = Interval { start, end };
        let strand = parse_strand(record.strand(), line_number)?;
        let feature_type = text(record.ty(), line_number, "feature type")?;
        let attributes = parse_attributes(&record, line_number)?;

        match feature_type.as_str() {
            "transcript" => {
                let transcript =
                    transcript_from_record(chrom, interval, strand, &attributes, line_number)?;
                let id = transcript.transcript_id.clone();
                ensure!(
                    transcripts.insert(id.clone(), transcript).is_none(),
                    "duplicate transcript {id:?} at GTF line {line_number}"
                );
            }
            "exon" | "CDS" | "start_codon" | "stop_codon" => {
                let transcript_id = required_attribute(&attributes, "transcript_id", line_number)?;
                let (kind, phase) = match feature_type.as_str() {
                    "exon" => {
                        ensure!(
                            record.phase().is_none(),
                            "exon has a phase at GTF line {line_number}"
                        );
                        (ChildKind::Exon, None)
                    }
                    "CDS" => {
                        let phase = record
                            .phase()
                            .ok_or_else(|| {
                                anyhow!("CDS is missing a phase at GTF line {line_number}")
                            })?
                            .with_context(|| {
                                format!("invalid CDS phase at GTF line {line_number}")
                            })?;
                        (ChildKind::Cds, Some(phase_to_exon_frame(phase)))
                    }
                    "start_codon" => (ChildKind::StartCodon, None),
                    "stop_codon" => (ChildKind::StopCodon, None),
                    _ => unreachable!(),
                };
                children.push(ChildFeature {
                    transcript_id,
                    chrom,
                    strand,
                    kind,
                    interval,
                    phase,
                });
            }
            "gene" | "UTR" | "five_prime_utr" | "three_prime_utr" | "Selenocysteine" => {}
            _ => bail!("unsupported feature type {feature_type:?} at GTF line {line_number}"),
        }
    }

    ensure!(
        !transcripts.is_empty(),
        "GTF contains no transcript records"
    );
    for child in children {
        let transcript = transcripts.get_mut(&child.transcript_id).ok_or_else(|| {
            anyhow!(
                "feature refers to transcript {:?}, which has no transcript record",
                child.transcript_id
            )
        })?;
        ensure!(
            child.chrom == transcript.chrom && child.strand == transcript.strand,
            "feature for transcript {:?} has a different chromosome or strand",
            child.transcript_id
        );
        ensure!(
            transcript.span.contains(child.interval),
            "feature for transcript {:?} lies outside its transcript record",
            child.transcript_id
        );
        match child.kind {
            ChildKind::Exon => transcript.exons.push(child.interval),
            ChildKind::Cds => transcript.cds.push(Cds {
                interval: child.interval,
                phase: child.phase.expect("CDS phase was checked"),
            }),
            ChildKind::StartCodon => transcript.start_codons.push(child.interval),
            ChildKind::StopCodon => transcript.stop_codons.push(child.interval),
        }
    }

    let mut records = transcripts
        .into_values()
        .map(transcript_to_bed)
        .collect::<Result<Vec<_>>>()?;
    records.sort_by(|a, b| {
        a.chrom
            .cmp(&b.chrom)
            .then(a.start.cmp(&b.start))
            .then(a.end.cmp(&b.end))
            .then(a.rest.cmp(&b.rest))
    });
    Ok(records)
}

type Attributes = Vec<(String, Vec<String>)>;

fn parse_attributes(record: &gtf::Record<'_>, line_number: usize) -> Result<Attributes> {
    let attributes = record
        .attributes()
        .with_context(|| format!("invalid attributes at GTF line {line_number}"))?;
    attributes
        .iter()
        .map(|result| {
            let (key, value) =
                result.with_context(|| format!("invalid attribute at GTF line {line_number}"))?;
            let key = text(key, line_number, "attribute key")?;
            let values = value
                .iter()
                .map(|value| text(value.as_ref(), line_number, "attribute value"))
                .collect::<Result<Vec<_>>>()?;
            ensure!(
                !values.is_empty(),
                "empty attribute value for {key:?} at GTF line {line_number}"
            );
            Ok((key, values))
        })
        .collect()
}

fn text(bytes: &[u8], line_number: usize, field: &str) -> Result<String> {
    let value = std::str::from_utf8(bytes)
        .with_context(|| format!("non-UTF-8 {field} at GTF line {line_number}"))?;
    ensure!(!value.is_empty(), "empty {field} at GTF line {line_number}");
    ensure!(
        !value.contains(['\t', '\n', '\r', '\0']),
        "invalid control character in {field} at GTF line {line_number}"
    );
    Ok(value.to_owned())
}

fn parse_strand(result: std::io::Result<GffStrand>, line_number: usize) -> Result<Strand> {
    let strand = result.with_context(|| format!("invalid strand at GTF line {line_number}"))?;
    match strand {
        GffStrand::Forward => Ok(Strand::Plus),
        GffStrand::Reverse => Ok(Strand::Minus),
        _ => bail!("strand must be + or - at GTF line {line_number}"),
    }
}

const fn phase_to_exon_frame(phase: Phase) -> i32 {
    let phase = match phase {
        Phase::Zero => 0,
        Phase::One => 1,
        Phase::Two => 2,
    };
    (3 - phase) % 3
}

fn attribute_values<'a>(attributes: &'a Attributes, key: &str) -> Vec<&'a str> {
    attributes
        .iter()
        .filter(|(candidate, _)| candidate == key)
        .flat_map(|(_, values)| values.iter().map(String::as_str))
        .collect()
}

fn required_attribute(attributes: &Attributes, key: &str, line_number: usize) -> Result<String> {
    let values = attribute_values(attributes, key);
    ensure!(
        values.len() == 1,
        "expected exactly one {key:?} attribute at GTF line {line_number}, found {}",
        values.len()
    );
    Ok(values[0].to_owned())
}

fn optional_attribute(
    attributes: &Attributes,
    keys: &[&str],
    fallback: &str,
    line_number: usize,
) -> Result<String> {
    for key in keys {
        let values = attribute_values(attributes, key);
        ensure!(
            values.len() <= 1,
            "expected at most one {key:?} attribute at GTF line {line_number}, found {}",
            values.len()
        );
        if let Some(value) = values.first() {
            return Ok((*value).to_owned());
        }
    }
    Ok(fallback.to_owned())
}

fn transcript_from_record(
    chrom: String,
    span: Interval,
    strand: Strand,
    attributes: &Attributes,
    line_number: usize,
) -> Result<Transcript> {
    let transcript_id = required_attribute(attributes, "transcript_id", line_number)?;
    let gene_id = required_attribute(attributes, "gene_id", line_number)?;
    let transcript_name = optional_attribute(
        attributes,
        &["transcript_name"],
        &transcript_id,
        line_number,
    )?;
    let transcript_type = optional_attribute(attributes, &["transcript_type"], "", line_number)?;
    let gene_name = optional_attribute(attributes, &["gene_name"], &gene_id, line_number)?;
    let gene_type = optional_attribute(attributes, &["gene_type"], "", line_number)?;
    let tags = attribute_values(attributes, "tag").join(",");
    let attributes_json = attributes_json(attributes)?;

    Ok(Transcript {
        chrom,
        span,
        strand,
        transcript_id,
        transcript_name,
        transcript_type,
        gene_id,
        gene_name,
        gene_type,
        tags,
        attributes_json,
        exons: Vec::new(),
        cds: Vec::new(),
        start_codons: Vec::new(),
        stop_codons: Vec::new(),
    })
}

fn attributes_json(attributes: &Attributes) -> Result<String> {
    let excluded = TYPED_ATTRIBUTES.iter().copied().collect::<HashSet<_>>();
    let mut ordered = Map::<String, Value>::new();
    for (key, values) in attributes {
        if excluded.contains(key.as_str()) {
            continue;
        }
        let incoming = values
            .iter()
            .cloned()
            .map(Value::String)
            .collect::<Vec<_>>();
        if let Some(existing) = ordered.get_mut(key) {
            match existing {
                Value::String(previous) => {
                    let mut combined = Vec::with_capacity(incoming.len() + 1);
                    combined.push(Value::String(std::mem::take(previous)));
                    combined.extend(incoming);
                    *existing = Value::Array(combined);
                }
                Value::Array(combined) => combined.extend(incoming),
                _ => unreachable!("only strings and arrays are inserted"),
            }
        } else if incoming.len() == 1 {
            ordered.insert(key.clone(), incoming.into_iter().next().expect("one value"));
        } else {
            ordered.insert(key.clone(), Value::Array(incoming));
        }
    }
    serde_json::to_string(&Value::Object(ordered)).context("failed to encode transcript attributes")
}

fn transcript_to_bed(mut transcript: Transcript) -> Result<BedRecord> {
    let label = &transcript.transcript_id;
    ensure!(
        !transcript.exons.is_empty(),
        "transcript {label:?} has no exons"
    );
    transcript.exons.sort_by_key(|interval| interval.start);
    for pair in transcript.exons.windows(2) {
        ensure!(
            pair[0].end <= pair[1].start,
            "transcript {label:?} has overlapping exons"
        );
    }
    ensure!(
        transcript
            .exons
            .first()
            .is_some_and(|exon| exon.start == transcript.span.start)
            && transcript
                .exons
                .last()
                .is_some_and(|exon| exon.end == transcript.span.end),
        "transcript {label:?} exon bounds do not match its transcript record"
    );

    for feature in transcript
        .cds
        .iter()
        .map(|cds| cds.interval)
        .chain(transcript.start_codons.iter().copied())
        .chain(transcript.stop_codons.iter().copied())
    {
        ensure!(
            transcript.exons.iter().any(|exon| exon.contains(feature)),
            "coding feature for transcript {label:?} is not contained in one exon"
        );
    }
    validate_codon(&transcript.start_codons, label, "start")?;
    validate_codon(&transcript.stop_codons, label, "stop")?;

    let chrom_start = transcript.span.start;
    let chrom_end = transcript.span.end;
    let block_sizes = transcript
        .exons
        .iter()
        .map(|exon| exon.end - exon.start)
        .collect::<Vec<_>>();
    let chrom_starts = transcript
        .exons
        .iter()
        .map(|exon| exon.start - chrom_start)
        .collect::<Vec<_>>();
    let mut exon_frames = vec![-1; transcript.exons.len()];
    for cds in &transcript.cds {
        let index = transcript
            .exons
            .iter()
            .position(|exon| exon.contains(cds.interval))
            .expect("CDS containment was checked");
        ensure!(
            exon_frames[index] == -1,
            "transcript {label:?} has multiple CDS records in one exon"
        );
        exon_frames[index] = cds.phase;
    }
    if transcript.strand == Strand::Minus {
        exon_frames.reverse();
    }

    let coding = !transcript.cds.is_empty();
    ensure!(
        coding || (transcript.start_codons.is_empty() && transcript.stop_codons.is_empty()),
        "noncoding transcript {label:?} has a codon feature"
    );
    let (thick_start, thick_end) = if coding {
        transcript
            .cds
            .iter()
            .map(|cds| cds.interval)
            .chain(transcript.start_codons.iter().copied())
            .chain(transcript.stop_codons.iter().copied())
            .fold((u32::MAX, 0), |(low, high), interval| {
                (low.min(interval.start), high.max(interval.end))
            })
    } else {
        (chrom_end, chrom_end)
    };
    let start_complete = !transcript.start_codons.is_empty();
    let stop_complete = !transcript.stop_codons.is_empty();
    let (cds_start_stat, cds_end_stat) = if coding {
        match transcript.strand {
            Strand::Plus => (status(start_complete), status(stop_complete)),
            Strand::Minus => (status(stop_complete), status(start_complete)),
        }
    } else {
        ("none", "none")
    };

    let block_count = transcript.exons.len();
    let rest = [
        transcript.transcript_id,
        "0".to_owned(),
        transcript.strand.as_str().to_owned(),
        thick_start.to_string(),
        thick_end.to_string(),
        "0".to_owned(),
        block_count.to_string(),
        comma_list(&block_sizes),
        comma_list(&chrom_starts),
        transcript.transcript_name,
        cds_start_stat.to_owned(),
        cds_end_stat.to_owned(),
        comma_list(&exon_frames),
        transcript.transcript_type,
        transcript.gene_id,
        transcript.gene_name,
        transcript.gene_type,
        transcript.tags,
        transcript.attributes_json,
    ]
    .join("\t");

    Ok(BedRecord {
        chrom: transcript.chrom,
        start: chrom_start,
        end: chrom_end,
        rest,
    })
}

const fn status(complete: bool) -> &'static str {
    if complete { "cmpl" } else { "incmpl" }
}

fn validate_codon(intervals: &[Interval], transcript_id: &str, kind: &str) -> Result<()> {
    if intervals.is_empty() {
        return Ok(());
    }
    let length = intervals.iter().try_fold(0_u32, |total, interval| {
        total.checked_add(interval.end - interval.start)
    });
    ensure!(
        length == Some(3),
        "transcript {transcript_id:?} {kind}_codon records do not total three bases"
    );
    Ok(())
}

fn comma_list<T: ToString>(values: &[T]) -> String {
    let mut result = values
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join(",");
    result.push(',');
    result
}

fn write_bigbed(
    output: &Path,
    chrom_sizes: HashMap<String, u32>,
    records: Vec<BedRecord>,
) -> Result<()> {
    let values = records
        .into_iter()
        .map(|record| {
            (
                record.chrom,
                BedEntry {
                    start: record.start,
                    end: record.end,
                    rest: record.rest,
                },
            )
        })
        .collect::<Vec<_>>();
    let source = BedParserStreamingIterator::wrap_infallible_iter(values.into_iter(), false);
    let mut writer = BigBedWrite::create_file(output, chrom_sizes)
        .with_context(|| format!("failed to create BigBed {}", output.display()))?;
    writer.autosql = Some(AUTOSQL.to_owned());
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .build()
        .context("failed to create writer runtime")?;
    writer
        .write(source, runtime)
        .map_err(|error| anyhow!(error.to_string()))
        .with_context(|| format!("failed to write BigBed {}", output.display()))
}
