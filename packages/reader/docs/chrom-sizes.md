# Chromosome sizes

Use `readChromSizes` to fetch a public `chrom.sizes` file, or `parseChromSizes` when you already have
its text. Both functions return an immutable map from sequence names to lengths.

## Usage

```ts
import { readChromSizes } from "@weng-lab/genomic-reader";

const chromosomes = await readChromSizes({
  url: "YOUR_URL_HERE",
});
```

The result can be passed directly to an assembly definition:

```ts
import { createAssemblyDefinition } from "@weng-lab/genomebrowser";
import { readChromSizes } from "@weng-lab/genomic-reader";

const chromosomes = await readChromSizes({ url: "YOUR_URL_HERE" });
const assembly = createAssemblyDefinition({
  id: "my-assembly",
  chromosomes,
});
```

## Parse existing text

Use `parseChromSizes` for uploaded files, bundled text, or another source that does not need a
network request:

```ts
import { parseChromSizes } from "@weng-lab/genomic-reader";

const chromosomes = parseChromSizes("chr1\t248956422\nchrM\t16569\n");
```

## File rules

Each non-empty line must contain one sequence name and one positive integer length separated by
whitespace. Names must be unique, and lengths must fit safely in a JavaScript number. Blank lines
are ignored.

The reader keeps every valid entry exactly as named. This includes ordinary chromosomes as well as
mitochondrial, alternate, patch, decoy, and unplaced sequences. It does not classify entries or
guess their biological meaning from naming patterns.

## Cancellation and errors

Pass an `AbortSignal` to cancel a network read:

```ts
const controller = new AbortController();
const promise = readChromSizes({
  url: "YOUR_URL_HERE",
  signal: controller.signal,
});

controller.abort();
await promise;
```

`readChromSizes` rejects for invalid or non-HTTP(S) URLs, cancelled requests, network failures,
non-successful HTTP responses, and invalid file contents. `parseChromSizes` throws for invalid text,
malformed rows, duplicate names, invalid lengths, and files with no entries.

For cross-origin URLs, the server must allow the browser to fetch the file through CORS.

## API

```ts
type ChromSizes = Readonly<Record<string, number>>;

type ReadChromSizesOptions = {
  url: string;
  signal?: AbortSignal;
};

function parseChromSizes(text: string): ChromSizes;
function readChromSizes(options: ReadChromSizesOptions): Promise<ChromSizes>;
```
