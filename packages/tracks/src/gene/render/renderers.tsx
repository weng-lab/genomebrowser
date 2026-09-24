import type { TrackRendererProps } from "@weng-lab/genomebrowser";
import { useMemo } from "react";
import type { GeneConfig, GeneData } from "../types";
import { findTranscriptTagColor, groupTranscriptsByGene } from "./features";
import { GeneRows } from "./GeneRows";

export function FullGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  return <GeneRows {...props} features={props.data} />;
}

export function TaggedGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  const transcripts = useMemo(
    () =>
      props.data.filter((transcript) => findTranscriptTagColor(transcript, props.config.tagColors)),
    [props.config.tagColors, props.data],
  );
  return <GeneRows {...props} features={transcripts} />;
}

export function MergedGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  const genes = useMemo(() => groupTranscriptsByGene(props.data), [props.data]);
  return <GeneRows {...props} features={genes} />;
}
