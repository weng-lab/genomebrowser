import { bigBedModule } from "./bigbed";
import { bigWigModule } from "./bigwig";
import { bulkBedModule } from "./bulkbed";
import { caveModule } from "./cave";
import { methylCModule } from "./methylc";
import { transcriptModule } from "./transcript";

export const firstPartyTrackModules = [
  bigBedModule,
  bigWigModule,
  bulkBedModule,
  caveModule,
  methylCModule,
  transcriptModule,
] as const;
