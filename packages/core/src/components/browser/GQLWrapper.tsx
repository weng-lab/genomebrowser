import { InMemoryCache } from "@apollo/client/cache";
import { ApolloClient } from "@apollo/client/core";
import { HttpLink } from "@apollo/client/link/http";
import { ApolloProvider } from "@apollo/client/react";

const uri = "https://screen.api.wenglab.org/graphql";
const client = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache(),
  devtools: {
    enabled: true,
    name: "Genome Browser",
  },
});

/**
 * @deprecated Prefer the consuming app's ApolloProvider so the browser shares
 * the same Apollo runtime and client instance as the rest of the app.
 */
export default function GQLWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
