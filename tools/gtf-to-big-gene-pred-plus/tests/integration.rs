use std::collections::HashMap;
use std::fs;
use std::io::{BufReader, Write};
use std::path::{Path, PathBuf};

use bigtools::BigBedRead;
use flate2::{Compression, write::GzEncoder};
use gtf_to_big_gene_pred_plus::{AUTOSQL, convert_gtf, read_chrom_sizes, run};

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name)
}

#[test]
fn fixture_conversion_matches_expected_bed() {
    let sizes = read_chrom_sizes(&fixture("chrom.sizes")).unwrap();
    let input = fs::File::open(fixture("input.gtf")).unwrap();
    let actual = convert_gtf(BufReader::new(input), &sizes)
        .unwrap()
        .into_iter()
        .map(|record| {
            format!(
                "{}\t{}\t{}\t{}\n",
                record.chrom, record.start, record.end, record.rest
            )
        })
        .collect::<String>();
    let expected = fs::read_to_string(fixture("expected.bed")).unwrap();
    assert_eq!(actual, expected);
}

#[test]
fn written_bigbed_supports_indexed_queries() {
    let temp = tempfile::tempdir().unwrap();
    let output = temp.path().join("fixture.bb");
    run(&fixture("input.gtf"), &fixture("chrom.sizes"), &output).unwrap();

    let mut reader = BigBedRead::open_file(&output).unwrap();
    assert_eq!(reader.autosql().unwrap().as_deref(), Some(AUTOSQL));
    assert_eq!(reader.item_count().unwrap(), 3);

    let plus = reader
        .get_interval("chr1", 350, 360)
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(plus.len(), 1);
    assert!(plus[0].start < 350);
    assert!(plus[0].rest.starts_with("TXPLUS\t"));

    let minus = reader
        .get_interval("chr1", 650, 720)
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(minus.len(), 1);
    assert!(minus[0].rest.starts_with("TXMINUS\t"));

    let absent = reader
        .get_interval("chr2", 200, 250)
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert!(absent.is_empty());
}

#[test]
fn gzip_input_is_supported() {
    let temp = tempfile::tempdir().unwrap();
    let input = temp.path().join("fixture.gtf.gz");
    let output = temp.path().join("fixture.bb");
    let mut encoder = GzEncoder::new(fs::File::create(&input).unwrap(), Compression::default());
    encoder
        .write_all(&fs::read(fixture("input.gtf")).unwrap())
        .unwrap();
    encoder.finish().unwrap();

    run(&input, &fixture("chrom.sizes"), &output).unwrap();
    let mut reader = BigBedRead::open_file(output).unwrap();
    assert_eq!(reader.item_count().unwrap(), 3);
}

#[test]
fn rejects_coordinates_outside_required_chromosome_sizes() {
    let input = b"chr1\ttest\ttranscript\t1\t11\t.\t+\t.\tgene_id \"g\"; transcript_id \"t\";\n";
    let error = convert_gtf(
        BufReader::new(&input[..]),
        &HashMap::from([("chr1".into(), 10)]),
    )
    .unwrap_err();
    assert!(error.to_string().contains("exceed chromosome size 10"));
}
