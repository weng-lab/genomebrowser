import { createCompositeModule } from "@weng-lab/genomebrowser";
import { CompositeSettings } from "./settings";

export const compositeModule = createCompositeModule({ settingsComponent: CompositeSettings });
