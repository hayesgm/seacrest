import http from "http";
import url from "url";
import path from "path";
import fetch from "node-fetch";
import { getWalletConnector } from "./connector.mjs";

async function eth_sendTransaction(
  chainId,
  accounts,
  walletConnector,
  [tx]
) {
  return await walletConnector.sendTransaction(tx);
}

async function net_version(session, chainId, accounts, walletConnector, []) {
  return chainId;
}

async function eth_accounts(session, chainId, accounts, walletConnector, []) {
  return accounts;
}

async function personal_sign(session, chainId, accounts, walletConnector, params) {
  let x = await signClient.request({
    topic: session.topic,
    chainId: `eip155:${chainId}`,
    request: {
      method: "personal_sign",
      params: params.length === 1 ? [params[0], accounts[0]] : params,
    }
  });
  console.log({x});
  return x;
}

const rpcFuncs = {
  eth_sendTransaction,
  net_version,
  eth_accounts,
  personal_sign
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
  pathname = pathname === "/" ? "" : pathname; // to avoid a trailing slash
  let hostname = url.parse(host).host;
  let proxyUrl = `${host}${pathname}`;
  let reqMethod = request.method;
  let reqHeaders = {
    ...request.headers,
    host: hostname,
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

export async function startServer(host, port, walletConnectProjectId, requestedNetwork, connectOpts={}) {
  const walletConnectorPromise = getWalletConnector(walletConnectProjectId, host, requestedNetwork, connectOpts);

  http
    .createServer(async (request, response) => {
      let reqBody = await getReqBody(request);
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

        let { session, chainId, accounts, walletConnector } =
          await walletConnectorPromise;
        let handlerRes = await handler(
          session,
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
