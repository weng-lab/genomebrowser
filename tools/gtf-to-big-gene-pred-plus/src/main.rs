use std::path::PathBuf;

use anyhow::Result;
use clap::Parser;

#[derive(Debug, Parser)]
#[command(about = "Convert a strict GTF annotation directly to BigGenePred-plus BigBed")]
struct Args {
    /// Input GTF. Files whose names end in .gz are decompressed as gzip.
    #[arg(value_name = "GTF")]
    input: PathBuf,

    /// Two-column chromosome sizes file.
    #[arg(long, value_name = "FILE")]
    chrom_sizes: PathBuf,

    /// Output BigBed file.
    #[arg(short, long, value_name = "BIGBED")]
    output: PathBuf,
}

fn main() -> Result<()> {
    let args = Args::parse();
    gtf_to_big_gene_pred_plus::run(&args.input, &args.chrom_sizes, &args.output)
}
