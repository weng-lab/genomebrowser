import { caveModule } from "@weng-lab/genomebrowser";
import { CaveSettings } from "./settings";

export const caveModuleWithSettings: typeof caveModule = {
  ...caveModule,
  settingsComponent: CaveSettings,
};
