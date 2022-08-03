import http from "http";
import url from "url";
import path from "path";
import fetch from "node-fetch";
import { getWalletConnector } from "./connector.mjs";

const walletConnectorPromise = getWalletConnector();

async function eth_sendTransaction(
  chainId,
  accounts,
  walletConnector,
  [from, to, gas, gasPrice, value, data, nonce]
) {
  const tx = {
    from,
    to,
    gas,
    gasPrice,
    value,
    data,
    nonce,
  };

  // Send transaction
  const result = await walletConnector.sendTransaction(tx);
  console.log({ result });
  return result;
}

async function net_version(chainId, accounts, walletConnector, []) {
  return chainId;
}

async function eth_accounts(chainId, accounts, walletConnector, []) {
  return accounts;
}

const rpcFuncs = {
  eth_sendTransaction,
  net_version,
  eth_accounts,
};

function getReqBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function proxy(host, request, reqBody, response) {
  let pathname = url.parse(request.url).pathname;
  let proxyUrl = `https://${host}${pathname}`;
  let reqMethod = request.method;
  let reqHeaders = {
    ...request.headers,
    host,
  };

  let result = await fetch(proxyUrl, {
    method: request.method,
    headers: reqHeaders,
    body: reqBody,
  });

  let headers = Object.fromEntries(
    Object.entries([...result.headers]).filter(([name, value]) => {
      return name.toLowerCase() === "content-type";
    })
  );

  let resData = new Uint8Array(await result.arrayBuffer());

  response.writeHead(result.status, headers);
  response.write(resData);
  response.end();
}

async function sendJson(response, json) {
  response.writeHead(200, { "content-type": "application/json" });
  response.write(JSON.stringify(json));
  response.end();
}

export async function startServer(host, port) {
  http
    .createServer(async (request, response) => {
      let reqBody = await getReqBody(request);
      console.log({reqBody});
      let requestJson;
      try {
        requestJson = JSON.parse(reqBody);
      } catch (e) {
        console.error(`Error parsing JSON: ${e}`);
        response.writeHead(400, { "content-type": "text/plain" });
        response.write("Invalid JSON request");
        response.end();
        return;
      }

      let rpcMethod = requestJson.method ?? null;
      let handler = rpcFuncs[rpcMethod];

      if (handler) {
        console.info(`[Seacrest][HTTP] Intercepting ${rpcMethod} request...`);

        let { chainId, accounts, walletConnector } =
          await walletConnectorPromise;
        let handlerRes = await handler(
          chainId,
          accounts,
          walletConnector,
          requestJson.params
        );

        await sendJson(response, {
          id: requestJson.id,
          jsonrpc: "2.0",
          result: handlerRes,
        });
      } else {
        console.info(`[Seacrest][HTTP] Proxying ${rpcMethod} request...`);
        await proxy(host, request, reqBody, response);
      }
    })
    .listen(port);

  console.log(
    `[Seacrest] Seacrest proxy running on http://localhost:${port} to ${host}`
  );
}
