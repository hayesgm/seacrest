import { startServer } from "./server.mjs";

const host = process.argv[2] || process.env["ETHEREUM_URL"];
if (!host) {
  throw new Error("Missing required ETHEREUM_URL");
}
if (!host.startsWith("http")) {
  throw new Error(`Expected host to start with http, got: ${host}`);
}
const port = Number(process.argv[3] || process.env["PORT"] || 8585);
let connectOpts = {};
if (process.env["LARGE"] === "false") {
  connectOpts.large = false;
}
if (process.env["RESHOW_DELAY"]) {
  connectOpts.reshowDelay = Number(process.env["RESHOW_DELAY"]);
}
if (process.env["REQUESTED_NETWORK"]) {
  let n = Number(process.env["REQUESTED_NETWORK"]);
  connectOpts.requestedNetwork = Number.isNaN(n) ? process.env["REQUESTED_NETWORK"] : n;
}

startServer(host, port, connectOpts);
