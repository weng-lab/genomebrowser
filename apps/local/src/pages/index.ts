import type { WorkspacePages } from "@weng-lab/workspace";
import { browserPage } from "./browser";
import { collectionsPage } from "./collections";
import { settingsPage } from "./settings";

/** The gb app's pages, in side bar order. The first opens for an unknown route. */
export const pages: WorkspacePages = [browserPage, collectionsPage, settingsPage];
