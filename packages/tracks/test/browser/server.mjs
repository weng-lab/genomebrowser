import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

export async function createFixtureServer(requests) {
  const root = fileURLToPath(new URL(".", import.meta.url));

  const scores = await readFile(
    new URL("../../../reader/test/fixtures/bigwig/basic.bw", import.meta.url),
  );
  // A real 2bit file: TCAG repeated over chr1, with the scored [200,260) block soft-masked.
  const reference = Buffer.alloc(49 + 3000, 0);
  reference.writeUInt32LE(0x1a412743, 0);
  reference.writeUInt32LE(1, 8);
  reference[16] = 4;
  reference.write("chr1", 17);
  reference.writeUInt32LE(25, 21);
  reference.writeUInt32LE(12000, 25);
  reference.writeUInt32LE(1, 33);
  reference.writeUInt32LE(200, 37);
  reference.writeUInt32LE(60, 41);
  // dnaSize, nBlockCount, maskBlockCount, maskStart, maskSize, reserved = 24 bytes.
  reference.fill(0x1b, 49);
  return createServer({
    configFile: false,
    root,
    plugins: [
      react(),
      {
        name: "genomic-fixtures",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!["/scores.bw", "/reference.2bit", "/broken.2bit"].includes(req.url)) return next();
            requests.push(req.url);
            if (req.url === "/broken.2bit") {
              res.statusCode = 404;
              res.end();
              return;
            }
            const bytes = req.url === "/scores.bw" ? scores : reference;
            const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? "");
            if (!match) {
              res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Accept-Ranges": "bytes",
              });
              res.end(bytes);
              return;
            }
            const start = Number(match[1]);
            const end = Math.min(Number(match[2]), bytes.length - 1);
            if (start > end) {
              res.writeHead(416, { "Content-Range": `bytes */${bytes.length}` });
              res.end();
              return;
            }
            res.writeHead(206, {
              "Accept-Ranges": "bytes",
              "Content-Length": end - start + 1,
              "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
              "Content-Type": "application/octet-stream",
            });
            res.end(bytes.subarray(start, end + 1));
          });
        },
      },
    ],
    resolve: {
      dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    },
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../..", import.meta.url))] },
    },
  });
}
