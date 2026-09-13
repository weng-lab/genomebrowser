/** Expected rejection of a mutation; the store is unchanged. */
export type MutationFailure<Code extends string> = {
  ok: false;
  code: Code;
  error: string;
};
