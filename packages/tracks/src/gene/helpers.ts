import type { GeneTranscript, GroupedGene } from "./types";

export function hasCanonicalTranscriptTag(
  transcript: GeneTranscript,
  canonicalTranscriptTags: readonly string[],
): boolean {
  return canonicalTranscriptTags.some((tag) => transcript.tags.includes(tag));
}

export function groupTranscriptsByGene(transcripts: readonly GeneTranscript[]): GroupedGene[] {
  const groups = new Map<string, GroupedGene>();
  for (const transcript of transcripts) {
    const key = `${transcript.chromosome}\u0000${transcript.strand}\u0000${transcript.geneId}`;
    const group = groups.get(key);
    if (group) {
      group.start = Math.min(group.start, transcript.start);
      group.end = Math.max(group.end, transcript.end);
      group.transcripts.push(transcript);
      if (!group.geneName && transcript.geneName) group.geneName = transcript.geneName;
    } else {
      groups.set(key, {
        kind: "gene",
        chromosome: transcript.chromosome,
        start: transcript.start,
        end: transcript.end,
        strand: transcript.strand,
        geneId: transcript.geneId,
        geneName: transcript.geneName,
        transcripts: [transcript],
      });
    }
  }
  return [...groups.values()];
}
