import { ApolloError } from "@apollo/client";

export interface Result {
  bigResult: {
    data: any; // TODO: type this
    error: ApolloError | undefined;
  }; // add more result types here and combine the loading boolean
  loading: boolean;
}
