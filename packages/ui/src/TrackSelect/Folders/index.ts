import { Assembly, FolderDefinition } from "./types";
import { humanBiosamplesFolder } from "./biosamples/human";
import { mouseBiosamplesFolder } from "./biosamples/mouse";
import { humanGenesFolder } from "./genes/human";
import { mouseGenesFolder } from "./genes/mouse";
import { humanOtherTracksFolder } from "./other-tracks/human";
import { humanMohdFolder } from "./mohd/human";

export {
  type Assembly,
  type FolderDefinition,
  type FolderRuntimeConfig,
} from "./types";

export type { BiosampleRowInfo } from "./biosamples/shared/types";
export type { GeneRowInfo } from "./genes/shared/types";
export type { MohdRowInfo } from "./mohd/shared/types";
export type { OtherTrackInfo } from "./other-tracks/shared/types";

// Registry of folders by assembly
export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
  GRCh38: [
    humanGenesFolder,
    humanBiosamplesFolder,
    humanMohdFolder,
    humanOtherTracksFolder,
  ],
  mm10: [mouseGenesFolder, mouseBiosamplesFolder],
};
