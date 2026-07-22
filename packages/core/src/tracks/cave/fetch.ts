import type { TrackFetchContext } from "../../modules/types";
import { fetchBigWigRaw } from "../bigwig/fetch";
import type { CaveConfig, CaveData } from "./types";

const phanh = "https://users.wenglab.org/phanh/PsychENCODE/hg38/";
const brainomeMethylationPath = "data/brainome/Methylation_BS_OXBS_bw/";

export async function fetchCave({
  config,
  region,
}: TrackFetchContext<CaveConfig>): Promise<CaveData> {
  const topUrl = createBrainomeUrl(config.neurotransmitter, "hmC", config.age);
  const bottomUrl = createBrainomeUrl(config.neurotransmitter, "OXBS", config.age);

  const [top, bottom] = await Promise.all([
    fetchBigWigRaw({ url: topUrl, region }),
    fetchBigWigRaw({ url: bottomUrl, region }),
  ]);
  return { top, bottom };
}

function createBrainomeUrl(
  neurotransmitter: CaveConfig["neurotransmitter"],
  assay: "hmC" | "OXBS",
  age: CaveConfig["age"],
) {
  return `${phanh}${brainomeMethylationPath}${neurotransmitter}_${assay}_${age}.CGN-both.frac.cov5.bw`;
}
