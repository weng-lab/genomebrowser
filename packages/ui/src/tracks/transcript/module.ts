import { transcriptModule } from "@weng-lab/genomebrowser";
import { TranscriptSettings } from "./settings";

export const transcriptModuleWithSettings: typeof transcriptModule = {
  ...transcriptModule,
  settingsComponent: TranscriptSettings,
};
