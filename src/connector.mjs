import SignClient from '@walletconnect/sign-client'
import qrcode from "qrcode-terminal";

const networks = {
  1: "mainnet",
  5: "goerli",
  42: "kovan",
};

export async function getWalletConnector(walletConnectProjectId, relayUrl, connectOpts={}) {
  const opts = {
    requestedNetwork: null, // take any
    reshowDelay: null,
    uriTimeout: 60000,
    retries: 10,
    large: true,
    ...connectOpts
  };

  let resolve;
  let reject;
  const promise = new Promise((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });
  
  function connect(resolve, reject, retries) {
    let reshowTimer = null;
    let attempted = false;

    const signClient = new SignClient.default(
      {
        projectId: walletConnectProjectId,
        metadata: {
          description: "WalletConnect GitHub Action",
          url: "https://github.com/hayesgm/seacrest",
          icons: ["https://github.com/hayesgm/seacrest/logo.png"],
          name: "Seacrest",
        },
        logger: 'trace'
      }
    );

    setTimeout(() => {
      if (!attempted) {
        clearTimeout(reshowTimer);

        // If we don't follow a link after so long, must retry
        if (retries === 0) {
          reject(`Failed to connect after ${opts.retries} retries.`);
        } else {
          connect(resolve, reject, retries === null ? null : retries - 1);
        }
      }
    }, opts.uriTimeout);

    function showUntilAttempted(uri) {
      if (!attempted) {
        console.info(
          `\n\n[Seacrest][WalletConnect] Please navigate to url:\n\n${uri}\n\nor visit QR code:\n`
        );
        qrcode.generate(uri, { small: !opts.large });

        if (opts.reshowDelay !== null) {
          reshowTimer = setTimeout(() => showUntilAttempted(uri), opts.reshowDelay);
        }
      }
    }

    console.log("scc", signClient);
    signClient.initialize().then(() => {
      // Create new session
      signClient.connect({
        // Provide the namespaces and chains (e.g. `eip155` for EVM-based chains) we want to use in this session.
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'personal_sign',
              'net_version',
              'eth_accounts'
            ],
            chains: ['eip155:1','eip155:5','eip155:42'],
            events: ['chainChanged', 'accountsChanged']
          }
        }
      }).then(({ uri, approval }) => {
        // Get uri for QR Code modal
        console.log({uri, approval});
        if (uri) {
          showUntilAttempted(uri);
        } else {
          console.error(`[Seacrest][WalletConnect] Error: No uri returned: uri=${uri}, approval=${approval}`);
        }
      });
    });

    signClient.on("connect", (p) => {
      console.log("connect", p);
    });

    signClient.on("session_event", (e) => {
      console.log("event", e);
    });

    // Subscribe to connection events
    signClient.on("session_update", ({ topic, params }) => {
      const { namespaces } = params;
      const _session = signClient.session.get(topic);
      attempted = true;

      console.log({topic, params, namespaces, _session});
      return;
      // Get provided accounts and chainId
      const { accounts, chainId } = payload.params[0];
      const network = networks[chainId] || chainId;

      if (opts.requestedNetwork && chainId !== opts.requestedNetwork && network !== opts.requestedNetwork) {
        console.info(
        `[Seacrest][WalletConnect] Error: connected to "${network}" with accounts ${JSON.stringify(accounts)}, but requested network "${opts.requestedNetwork}". Please change networks and try again.`
        );

        // Wait 5 seconds to give user a moment to read before another QR code pops in
        setTimeout(() => connect(resolve, reject, retries), 5000);
      } else {
        console.info(
        `[Seacrest][WalletConnect] Connected to ${network} with accounts ${JSON.stringify(
            accounts
          )}`
        );

        resolve({ signClient, accounts, chainId });
      }
    });

    signClient.on("session_update", (error, payload) => {
      if (error) {
        reject(error);
      }
      const { accounts, chainId } = payload.params[0];
      console.error(
        `[Seacrest][WalletConnect] Error: changed session ${JSON.stringify({
          accounts,
          chainId,
        })}`
      );
    });

    signClient.on("disconnect", (error, payload) => {
      if (error) {
        reject(error);
      }
      console.error(`[Seacrest][WalletConnect] Disconnected`);
    });
  }

  connect(resolve, reject, opts.retries);

  return promise;
}
