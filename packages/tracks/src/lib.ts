import { rulerModule } from "./ruler";
import { bigBedModule } from "./bigbed";
import { bigWigModule } from "./bigwig";
import { bulkBedModule } from "./bulkbed";
import { caveModule } from "./cave";
import { ccreBigBedModule } from "./ccre";
import { geneModule } from "./gene";
import { methylCModule } from "./methylc";
import { transcriptModule } from "./transcript";

export const firstPartyTrackModules = [
  rulerModule,
  bigBedModule,
  bigWigModule,
  bulkBedModule,
  caveModule,
  ccreBigBedModule,
  geneModule,
  methylCModule,
  transcriptModule,
] as const;
