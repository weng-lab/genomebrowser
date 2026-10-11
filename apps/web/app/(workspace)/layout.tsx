import type { ReactNode } from "react";
import { Workspace } from "../../components/workspace/Workspace";
import { navigation } from "../../navigation";
import { AppProviders } from "./AppProviders";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <Workspace navigation={navigation}>{children}</Workspace>
    </AppProviders>
  );
}
