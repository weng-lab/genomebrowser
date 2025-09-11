import { AllRequests } from "./requestBuilder";

import { LazyQueryExecFunction, OperationVariables } from "@apollo/client";

export interface QueryExecutors {
  fetchBigData: LazyQueryExecFunction<unknown, OperationVariables>;
  fetchGene: LazyQueryExecFunction<unknown, OperationVariables>;
  fetchMotif: LazyQueryExecFunction<unknown, OperationVariables>;
  fetchImportance: LazyQueryExecFunction<unknown, OperationVariables>;
  fetchBulkBed: LazyQueryExecFunction<unknown, OperationVariables>;
  fetchMethylC: LazyQueryExecFunction<unknown, OperationVariables>;
  fetchLD: LazyQueryExecFunction<unknown, OperationVariables>;
}

/**
 * Execute all queries concurrently based on built requests
 */
export async function executeAllQueries(requests: AllRequests, executors: QueryExecutors): Promise<void> {
  const promises: Promise<unknown>[] = [];

  // Execute BigWig/BigBed queries
  if (requests.bigRequests.length > 0) {
    promises.push(executors.fetchBigData({ variables: { bigRequests: requests.bigRequests } }));
  }

  // Execute transcript query
  if (requests.transcriptRequest) {
    promises.push(executors.fetchGene({ variables: requests.transcriptRequest }));
  }

  // Execute motif query
  if (requests.motifRequest) {
    promises.push(executors.fetchMotif({ variables: requests.motifRequest }));
  }

  // Execute importance queries
  if (requests.importanceRequests.length > 0) {
    promises.push(executors.fetchImportance({ variables: { bigRequests: requests.importanceRequests } }));
  }

  // Execute BulkBed queries
  if (requests.bulkBedRequests.length > 0) {
    promises.push(executors.fetchBulkBed({ variables: { bigRequests: requests.bulkBedRequests } }));
  }

  // Execute LD query
  if (requests.ldRequest) {
    promises.push(executors.fetchLD({ variables: requests.ldRequest }));
  }

  // Execute MethylC queries
  if (requests.methylCRequest) {
    promises.push(executors.fetchMethylC({ variables: { bigRequests: requests.methylCRequest } }));
  }

  // Execute all queries concurrently
  await Promise.allSettled(promises);
}
