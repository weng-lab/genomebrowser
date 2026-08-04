import { bigWigModule } from "@weng-lab/genomebrowser";
import { BigWigSettings } from "./settings";

export const bigWigModuleWithSettings: typeof bigWigModule = {
  ...bigWigModule,
  settingsComponent: BigWigSettings,
};
