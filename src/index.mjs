import { startServer } from "./server.mjs";

const host = process.argv[2] || process.env["ETHEREUM_URL"];
if (!host) {
  throw new Error("Missing required ETHEREUM_URL");
}
if (!host.startsWith("http")) {
  throw new Error(`Expected host to start with http, got: ${host}`);
}
const port = process.env["PORT"] || 8585;

startServer(host, port);
