import type {
  AnyTrackInteraction,
  TrackInteraction,
  TrackRuntimeContext,
} from "@weng-lab/genomebrowser";
import type { TrackSelectMetadata, TrackSelectTrack } from "../schema/collectionSchema";

export type TrackSelectCollectionContext = Readonly<{
  collectionId: string;
  authoredTrackId: string;
  metadata: Readonly<TrackSelectMetadata>;
}>;

type TrackSelectInteractionCallback<Item, Config> = (
  item: Item,
  runtime: TrackRuntimeContext<Config>,
  collection: TrackSelectCollectionContext,
) => void;

export type TrackSelectInteraction<Item, Config = unknown> = {
  onClick?: TrackSelectInteractionCallback<Item, Config>;
  onHover?: TrackSelectInteractionCallback<Item, Config>;
  onLeave?: TrackSelectInteractionCallback<Item, Config>;
};

export type AnyTrackSelectInteraction = TrackSelectInteraction<never, never>;

export type TrackSelectInteractionResolver = (
  entry: Readonly<{
    collectionId: string;
    qualifiedTrackId: string;
    track: TrackSelectTrack;
  }>,
) => AnyTrackSelectInteraction | undefined;

export function adaptTrackSelectInteraction(
  interaction: AnyTrackSelectInteraction,
  collection: TrackSelectCollectionContext,
): AnyTrackInteraction {
  assertValidTrackSelectInteraction(interaction);

  const onClick = interaction.onClick as
    | TrackSelectInteractionCallback<unknown, unknown>
    | undefined;
  const onHover = interaction.onHover as
    | TrackSelectInteractionCallback<unknown, unknown>
    | undefined;
  const onLeave = interaction.onLeave as
    | TrackSelectInteractionCallback<unknown, unknown>
    | undefined;
  const adapted: TrackInteraction<unknown, unknown> = {
    ...(onClick ? { onClick: (item, runtime) => onClick(item, runtime, collection) } : {}),
    ...(onHover ? { onHover: (item, runtime) => onHover(item, runtime, collection) } : {}),
    ...(onLeave ? { onLeave: (item, runtime) => onLeave(item, runtime, collection) } : {}),
  };

  return adapted as AnyTrackInteraction;
}

function assertValidTrackSelectInteraction(
  interaction: AnyTrackSelectInteraction,
): asserts interaction is AnyTrackSelectInteraction {
  if (!isRecord(interaction)) throw new Error("TrackSelect interaction must be an object");

  const callbackNames = new Set(["onClick", "onHover", "onLeave"]);
  for (const [name, callback] of Object.entries(interaction)) {
    if (!callbackNames.has(name)) {
      throw new Error(`TrackSelect interaction contains unknown callback: ${name}`);
    }
    if (callback !== undefined && typeof callback !== "function") {
      throw new Error(`TrackSelect interaction ${name} must be a function`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
