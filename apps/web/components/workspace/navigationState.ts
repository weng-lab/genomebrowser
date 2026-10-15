import { createContext } from "react";

/** Application operations can temporarily disable workspace sidebar navigation. */
export const WorkspaceNavigationDisabledContext = createContext(false);
