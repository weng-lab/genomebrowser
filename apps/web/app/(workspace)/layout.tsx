import type { ReactNode } from "react";
import { Workspace } from "../../shared/workspace/Workspace";
import { AccountControls } from "../../features/account/components/AccountControls";
import { AppProviders } from "../../composition/AppProviders";
import { navigation } from "../../composition/navigation";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <Workspace navigation={navigation} footer={<AccountControls />}>
        {children}
      </Workspace>
    </AppProviders>
  );
}
