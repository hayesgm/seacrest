#!/bin/sh
":" //# comment; exec /usr/bin/env node --noharmony "$0" "$@"
import { startServer } from "./server.mjs";

let host = process.argv[2] || process.env["ETHEREUM_URL"] || 'https://mainnet.infura.io';
if (!host.startsWith("http")) {
  throw new Error(`Expected host to start with http, got: ${host}`);
}
const portStr = process.argv[3] || process.env["PORT"] || 8585;
const port = Number(portStr);
if (Number.isNaN(port)) {
  throw new Error(`Invalid port ${portStr}`);
}
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
