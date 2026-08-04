import { methylCModule } from "@weng-lab/genomebrowser";
import { MethylCSettings } from "./settings";

export const methylCModuleWithSettings: typeof methylCModule = {
  ...methylCModule,
  settingsComponent: MethylCSettings,
};
