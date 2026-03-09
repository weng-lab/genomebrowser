import { BigBedDefinition } from "./bigbed/definition";
import { BigWigDefinition } from "./bigwig/definition";
import { BulkBedDefinition } from "./bulkbed/definition";
import { ImportanceDefinition } from "./importance/definition";
import { MethylCDefinition } from "./methylC/definition";
import { MotifDefinition } from "./motif/definition";
import { TranscriptDefinition } from "./transcript/definition";

export const builtInTrackDefinitions = [
  BigWigDefinition,
  BigBedDefinition,
  TranscriptDefinition,
  MethylCDefinition,
  BulkBedDefinition,
  MotifDefinition,
  ImportanceDefinition,
];
