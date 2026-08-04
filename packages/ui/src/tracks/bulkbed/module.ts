import { bulkBedModule } from "@weng-lab/genomebrowser";
import { BulkBedSettings } from "./settings";

export const bulkBedModuleWithSettings: typeof bulkBedModule = {
  ...bulkBedModule,
  settingsComponent: BulkBedSettings,
};
