const validFixture = [
  "chr1\t0\t30000000\tp36.3\tgneg",
  "chr1\t30000000\t60000000\tp36.2\tgpos50",
  "chr1\t60000000\t90000000\tp11\tacen",
  "chr1\t90000000\t120000000\tq11\tacen",
  "chr1\t120000000\t180000000\tq21\tgvar",
  "chr1\t180000000\t248956422\tq44\tgpos100",
  "chrM\t0\t5000\t\tgneg",
  "chrM\t5000\t10500\t\tgpos75",
  "chrM\t10500\t16569\t\tgneg",
].join("\n");

const malformedFixture = ["chr1\t0\t30\tp36.3\tgneg", "chr1\tnot-a-coordinate\t55\tp11\tacen"].join(
  "\n",
);

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const delay = clampDelay(searchParams.get("delay"));
  const text = searchParams.get("mode") === "malformed" ? malformedFixture : validFixture;

  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

  return new Response(`${text}\n`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function clampDelay(value: string | null) {
  const delay = Number(value);
  return Number.isFinite(delay) ? Math.min(10_000, Math.max(0, Math.trunc(delay))) : 0;
}
