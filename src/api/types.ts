import { ApolloError } from "@apollo/client";
import { Data } from "../components/tracks/bigwig/types";

export interface Result {
  bigResult: {
    data: Data | undefined;
    error: ApolloError | undefined;
  };
  loading: boolean;
}
