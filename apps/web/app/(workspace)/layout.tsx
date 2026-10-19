import type { ReactNode } from "react";
import { Workspace } from "../../components/workspace/Workspace";
import {
  createIdentity,
  identityMode,
  mockUserCookie,
  mockUserIds,
  signInPath,
} from "../../server/identity";
import { AccountControls, type Account } from "./AccountControls";
import { AppProviders } from "./AppProviders";
import { navigation } from "./navigation";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  // Clerk reports the signed-in user to the client itself; mock users exist only on the server.
  const mode = identityMode(process.env);
  const account: Account =
    mode === "clerk"
      ? { mode, signInPath }
      : {
          mode,
          userId: await createIdentity(mode).userId(),
          users: mockUserIds,
          cookie: mockUserCookie,
        };
  return (
    <AppProviders account={account}>
      <Workspace navigation={navigation} footer={<AccountControls account={account} />}>
        {children}
      </Workspace>
    </AppProviders>
  );
}
