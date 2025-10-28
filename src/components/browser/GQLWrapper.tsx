import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from "@apollo/client";

const uri = "https://screen.api.wenglab.org/graphql";
const client = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache(),
  devtools: {
    enabled: true,
    name: "Genome Browser",
  },
});

export default function GQLWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
