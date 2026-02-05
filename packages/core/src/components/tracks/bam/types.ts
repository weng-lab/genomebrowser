import React from "react";
import { Config, TrackDimensions, TrackType } from "../types";

export interface BamRect {
  start: number;
  end: number;
  color?: string;
  cigarOps: { opStart: number; opEnd: number; op: string }[];
  strand?: boolean;
  seq?: string;
  name?: string;
}

export interface BamConfig extends Config<BamRect> {
  trackType: TrackType.Bam;
  url: string;
  indexUrl: string;
}

interface BamProps {
  id: string;
  data?: BamRect[];
  color?: string;
  height: number;
  dimensions: TrackDimensions;
  verticalPadding?: number;
  onClick?: (rect: BamRect) => void;
  onHover?: (rect: BamRect) => void;
  onLeave?: (rect: BamRect) => void;
  tooltip?: React.FC<BamRect>;
}

export type DenseBamProps = BamProps;

export interface SquishBamProps extends BamProps {
  rowHeight?: number;
}
