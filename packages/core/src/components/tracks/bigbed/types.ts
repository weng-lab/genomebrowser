import { TrackType, TrackDimensions, Config, InteractionConfig } from "../types";

export type BigBedFieldKind = "string" | "number";

export type BigBedSchema = Record<string, BigBedFieldKind>;

export interface BigBedRow {
  chr: string;
  start: number;
  end: number;
}

export type BigBedParser<Row = unknown> = (chrom: string, startBase: number, endBase: number, rest: string) => Row;

type InferBigBedFieldValue<TKind extends BigBedFieldKind> = TKind extends "number"
  ? number | string | undefined
  : string | undefined;

type InferBigBedSchemaFields<TSchema extends BigBedSchema> = {
  [Key in keyof TSchema]: InferBigBedFieldValue<TSchema[Key]>;
};

export type InferBigBedRow<TSchema extends BigBedSchema | undefined = undefined> = TSchema extends BigBedSchema
  ? BigBedRow & InferBigBedSchemaFields<TSchema> & { rest: string[] }
  : Rect;

type BivariantCallback<Item> = { bivarianceHack(item: Item): void }["bivarianceHack"];

type BivariantTooltip<Item> = { bivarianceHack(props: Item): React.ReactElement | null }["bivarianceHack"];

interface BigBedInteractionConfig<Item> extends Omit<
  InteractionConfig<Item>,
  "onClick" | "onHover" | "onLeave" | "tooltip"
> {
  onClick?: BivariantCallback<Item>;
  onHover?: BivariantCallback<Item>;
  onLeave?: BivariantCallback<Item>;
  tooltip?: BivariantTooltip<Item>;
}

export interface BigBedConfig<TSchema extends BigBedSchema | undefined = undefined>
  extends
    Omit<Config<InferBigBedRow<TSchema>>, keyof InteractionConfig<InferBigBedRow<TSchema>>>,
    BigBedInteractionConfig<InferBigBedRow<TSchema>> {
  trackType: TrackType.BigBed;
  url: string;
  schema?: TSchema;
}

interface BigBedProps {
  id: string;
  data: Rect[];
  color: string;
  height: number;
  dimensions: TrackDimensions;
  verticalPadding?: number; // Vertical padding as fraction of height (default 0.2 = 20%)
  onClick?: (rect: Rect) => void;
  onHover?: (rect: Rect) => void;
  onLeave?: (rect: Rect) => void;
  tooltip?: React.FC<Rect>;
}

export type SquishBigBedProps = BigBedProps;

export type DenseBigBedProps = BigBedProps;

export interface Rect {
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number | string;
}

export interface SquishRect {
  start: number;
  end: number;
  color?: string;
  name?: string;
  rectname?: string;
  score?: number | string;
}

export interface RenderedRect extends Rect {
  row: Rect;
}

export interface RenderedSquishRect extends SquishRect {
  row: Rect;
}
