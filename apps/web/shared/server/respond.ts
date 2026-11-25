import "server-only";

type CodedError<Code extends string> = abstract new (...args: never[]) => Error & {
  readonly code: Code;
};

/**
 * Create the responder for one feature's route handlers. A route runs its operation through it:
 * the result is JSON, or 204 without one. The feature's errors keep their code and status; any
 * other failure is logged as `failure.log` and reported as `failure.message`, without detail.
 * Responses are never cached.
 */
export function createResponder<Code extends string>(
  FeatureError: CodedError<Code>,
  statuses: Record<Code, number>,
  failure: { log: string; message: string },
) {
  return async function respond(operation: () => Promise<unknown>) {
    const headers = { "Cache-Control": "no-store" };
    try {
      const result = await operation();
      return result === undefined
        ? new Response(null, { status: 204, headers })
        : Response.json(result, { headers });
    } catch (error) {
      if (error instanceof FeatureError) {
        return Response.json(
          { code: error.code, message: error.message },
          { status: statuses[error.code], headers },
        );
      }
      console.error(failure.log, error);
      return Response.json({ message: failure.message }, { status: 500, headers });
    }
  };
}
