import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { fetchBigWigRaw } from "../bigwig/fetch";
import type { CaveConfig, CaveData } from "./types";
const base =
  "https://users.wenglab.org/phanh/PsychENCODE/hg38/data/brainome/Methylation_BS_OXBS_bw/";
export async function fetchCave({
  config,
  region,
}: TrackFetchContext<CaveConfig>): Promise<CaveData> {
  const url = (assay: "hmC" | "OXBS") =>
    `${base}${config.neurotransmitter}_${assay}_${config.age}.CGN-both.frac.cov5.bw`;
  const [top, bottom] = await Promise.all([
    fetchBigWigRaw({ url: url("hmC"), region }),
    fetchBigWigRaw({ url: url("OXBS"), region }),
  ]);
  return { top, bottom };
}
