import type { z } from "zod";
import type { TrackConfigBase, TrackInteractionConfig } from "../../modules/types";

export type BigBedDisplay = "dense" | "squish";

export type BigBedSchema = z.ZodObject;

export interface BigBedConfig<TSchema extends BigBedSchema | undefined = BigBedSchema | undefined>
  extends
    Omit<TrackConfigBase, keyof TrackInteractionConfig<any, any>>,
    TrackInteractionConfig<InferBigBedRow<TSchema>, BigBedConfig<TSchema>> {
  type: "bigbed";
  display: BigBedDisplay;
  url: string;
  schema?: TSchema;
}

export type BigBedData = BigBedRow[];

export type BigBedRow = {
  chr?: string;
  chrom?: string;
  chromStart?: number;
  chromEnd?: number;
  start: number;
  end: number;
  name?: string;
  score?: number | string;
  strand?: string;
  color?: string;
  rest?: string[] | string;
  [key: string]: unknown;
};

export type InferBigBedRow<TSchema extends BigBedSchema | undefined = undefined> =
  TSchema extends BigBedSchema ? z.output<TSchema> & BigBedRow : BigBedRow;

export type RenderedBigBedRect = {
  row: BigBedRow;
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number | string;
};

export type BigBedInput = {
  id: string;
  title: string;
  url: string;
  schema?: BigBedSchema;
  display?: BigBedDisplay;
  height?: number;
  color?: string;
} & Partial<TrackInteractionConfig<BigBedRow, BigBedConfig>>;
