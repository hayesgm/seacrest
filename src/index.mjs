#!/bin/sh
":" //# comment; exec /usr/bin/env node --noharmony "$0" "$@"
import { startServer } from "./server.mjs";

let requestedNetwork = process.argv[2] || process.env["REQUESTED_NETWORK"];
if (!Number.isNaN(Number(requestedNetwork))) {
  requestedNetwork = Number(requestedNetwork);
}
if (!requestedNetwork) {
  throw new Error(`Missing required REQUESTED_NETWORK`);
}

const walletConnectProjectId = process.argv[3] || process.env["WALLET_CONNECT_PROJECT_ID"];
if (!walletConnectProjectId) {
  throw new Error(`Missing required WALLET_CONNECT_PROJECT_ID`);
}

let host = process.argv[4] || process.env["ETHEREUM_URL"] || 'https://mainnet.infura.io';
if (!host.startsWith("http")) {
  throw new Error(`Expected host to start with http, got: ${host}`);
}
const portStr = process.argv[5] || process.env["PORT"] || 8585;
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

startServer(host, port, walletConnectProjectId, requestedNetwork, connectOpts);
