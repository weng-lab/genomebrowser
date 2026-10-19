import { createBrowserServer } from "./server.ts";

const port = Number(process.env.GB_SERVER_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid GB_SERVER_PORT");
const host = process.env.GB_SERVER_HOST ?? "127.0.0.1";
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  throw new Error("GB_SERVER_HOST must be localhost, 127.0.0.1, or ::1");
}
const allowedOrigins = process.env.GB_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim());
const server = createBrowserServer({ allowedOrigins });
server.listen(port, host, () => console.log(`Browser server listening at http://${host}:${port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close());
}
