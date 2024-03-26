import http from "http";
import url from "url";
import path from "path";
import fetch from "node-fetch";
import { getWalletConnector } from "./connector.mjs";

async function eth_sendTransaction(
  signClient,
  session,
  chainId,
  accounts,
  walletConnector,
  [tx]
) {
  return await await signClient.request({
    topic: session.topic,
    chainId: `eip155:${chainId}`,
    request: {
      method: "eth_sendTransaction",
      params: [ tx ],
    },
  })
}

async function net_version(signClient, session, chainId, accounts, walletConnector, []) {
  return chainId;
}

async function eth_accounts(signClient, session, chainId, accounts, walletConnector, []) {
  return accounts;
}

async function personal_sign(signClient, session, chainId, accounts, walletConnector, params) {
  return await signClient.request({
    topic: session.topic,
    chainId: `eip155:${chainId}`,
    request: {
      method: "personal_sign",
      params: params.length === 1 ? [params[0], accounts[0]] : params,
    }
  });
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

async function proxy(host, request, reqBody) {
  let pathname = url.parse(request.url).pathname;
  pathname = pathname === "/" ? "" : pathname; // to avoid a trailing slash
  let hostname = url.parse(host).host;
  let proxyUrl = `${host}${pathname}`;
  let reqHeaders = {
    ...request.headers,
    host: hostname,
  };

  let result = await fetch(proxyUrl, {
    method: request.method,
    headers: reqHeaders,
    body: reqBody,
  });

  return new TextDecoder().decode(await result.arrayBuffer());
}

async function sendJson(response, json) {
  response.writeHead(200, { "content-type": "application/json" });
  response.write(JSON.stringify(json));
  response.end();
}

async function handleIndividualRequest(
  host,
  request,
  walletConnectorPromise,
  requestJson
) {
  let rpcMethod = requestJson.method ?? null;
  let handler = rpcFuncs[rpcMethod];
  if (!handler) {
    console.info(`[Seacrest][HTTP] Proxying ${rpcMethod} request...`);
    return JSON.parse(await proxy(host, request, JSON.stringify(requestJson)));
  } else {
    console.info(`[Seacrest][HTTP] Intercepting ${rpcMethod} request...`);

    let { signClient, session, chainId, accounts, walletConnector } =
      await walletConnectorPromise;
    let handlerRes = await handler(
      signClient,
      session,
      chainId,
      accounts,
      walletConnector,
      requestJson.params
    );

    return { jsonrpc: "2.0", id: requestJson.id, result: handlerRes };
  }
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

      if (!Array.isArray(requestJson)) {
        requestJson = [requestJson];
      }

      let reqResponses = [];
      for (let req of requestJson) {
        reqResponses.push(
          await handleIndividualRequest(
            host,
            request,
            walletConnectorPromise,
            req
          )
        );
      }

      await sendJson(response, reqResponses);
    })
    .listen(port);

  console.log(
    `[Seacrest] Seacrest proxy running on http://localhost:${port} to ${host}`
  );
}
