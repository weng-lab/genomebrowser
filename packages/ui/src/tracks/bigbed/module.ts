import { bigBedModule } from "@weng-lab/genomebrowser";
import { BigBedSettings } from "./settings";

export const bigBedModuleWithSettings: typeof bigBedModule = {
  ...bigBedModule,
  settingsComponent: BigBedSettings,
};
