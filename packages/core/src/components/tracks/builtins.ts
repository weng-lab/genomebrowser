import { BigBedDefinition } from "./bigbed";
import { BigWigDefinition } from "./bigwig";
import { BulkBedDefinition } from "./bulkbed";
import { ImportanceDefinition } from "./importance";
import { MethylCDefinition } from "./methylC";
import { MotifDefinition } from "./motif";
import { TranscriptDefinition } from "./transcript";

export const builtInTrackDefinitions = [
  BigWigDefinition,
  BigBedDefinition,
  TranscriptDefinition,
  MethylCDefinition,
  BulkBedDefinition,
  MotifDefinition,
  ImportanceDefinition,
];
