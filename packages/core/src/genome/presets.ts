import { createAssemblyDefinition } from "./assembly";

export const hg38 = createAssemblyDefinition({
  id: "hg38",
  chromosomes: {
    chr1: 248956422,
    chr2: 242193529,
    chr3: 198295559,
    chr4: 190214555,
    chr5: 181538259,
    chr6: 170805979,
    chr7: 159345973,
    chr8: 145138636,
    chr9: 138394717,
    chr10: 133797422,
    chr11: 135086622,
    chr12: 133275309,
    chr13: 114364328,
    chr14: 107043718,
    chr15: 101991189,
    chr16: 90338345,
    chr17: 83257441,
    chr18: 80373285,
    chr19: 58617616,
    chr20: 64444167,
    chr21: 46709983,
    chr22: 50818468,
    chrX: 156040895,
    chrY: 57227415,
    chrM: 16569,
  },
});

export const mm10 = createAssemblyDefinition({
  id: "mm10",
  chromosomes: {
    chr1: 195471971,
    chr2: 182113224,
    chr3: 160039680,
    chr4: 156508116,
    chr5: 151834684,
    chr6: 149736546,
    chr7: 145441459,
    chr8: 129401213,
    chr9: 124595110,
    chr10: 130694993,
    chr11: 122082543,
    chr12: 120129022,
    chr13: 120421639,
    chr14: 124902244,
    chr15: 104043685,
    chr16: 98207768,
    chr17: 94987271,
    chr18: 90702639,
    chr19: 61431566,
    chrX: 171031299,
    chrY: 91744698,
    chrM: 16299,
  },
});

export const ce11 = createAssemblyDefinition({
  id: "ce11",
  chromosomes: {
    chrI: 15072434,
    chrII: 15279421,
    chrIII: 13783801,
    chrIV: 17493829,
    chrV: 20924180,
    chrX: 17718942,
    chrM: 13794,
  },
});

export const dm6 = createAssemblyDefinition({
  id: "dm6",
  chromosomes: {
    chr2L: 23513712,
    chr2R: 25286936,
    chr3L: 28110227,
    chr3R: 32079331,
    chr4: 1348131,
    chrX: 23542271,
    chrY: 3667352,
    chrM: 19524,
  },
});

export const tair10 = createAssemblyDefinition({
  id: "tair10",
  chromosomes: {
    Chr1: 30427671,
    Chr2: 19698289,
    Chr3: 23459830,
    Chr4: 18585056,
    Chr5: 26975502,
    ChrM: 366924,
    ChrC: 154478,
  },
});
