import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: "https://screen.api.wenglab.org/graphql",
  cache: new InMemoryCache(),
  connectToDevTools: true,
});

export default function GQLWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
