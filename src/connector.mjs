import SignClient from '@walletconnect/sign-client'
import qrcode from "qrcode-terminal";

const networks = {
  'mainnet': 1,
  'goerli': 5, 
  'fuji': 43113,
  'mumbai': 80001,
  'polygon': 137,
  'arbitrum': 42161,
  'arbitrum-goerli': 421613,
  'base-goerli': 84531,
  'linea-goerli': 59140,
};

export async function getWalletConnector(walletConnectProjectId, relayUrl, requestedNetwork, connectOpts={}) {
  const opts = {
    reshowDelay: null,
    uriTimeout: 120000,
    retries: 10,
    large: true,
    ...connectOpts
  };

  if (typeof(requestedNetwork) === 'string') {
    if (requestedNetwork in networks) {
      requestedNetwork = networks[requestedNetwork];
    } else {
      throw new Error(`Invalid or unknown Seacrest network: ${requestedNetwork}`);
    }
  }

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
        }
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
            chains: [`eip155:${requestedNetwork}`],
            events: ['chainChanged', 'accountsChanged']
          }
        }
      }).then(({ uri, approval }) => {
        // Get uri for QR Code modal
        approval().then((session) => {
          let chainAccounts = session.namespaces.eip155.accounts.map((d) => {
            let [_, chainId, account] = d.split(':');
            return { chainId: Number(chainId), account };
          });
          let matchingChainAccounts = chainAccounts
            .filter(({chainId}) => requestedNetwork === chainId)
          attempted = true;

          if (matchingChainAccounts.length === 0) {
            console.info(
            `[Seacrest][WalletConnect] Error: connected to Seacrest with accounts ${JSON.stringify(chainAccounts)}, but requested network "${requestedNetwork}". Please change networks and try again.`
            );

            // Wait 5 seconds to give user a moment to read before another QR code pops in
            setTimeout(() => connect(resolve, reject, retries), 5000);
          } else {
            let accounts = matchingChainAccounts.map(({account}) => account);
            console.info(
            `[Seacrest][WalletConnect] Connected to Seacrest with accounts ${JSON.stringify(
                accounts
              )}`
            );

            resolve({ signClient, session, chainId: requestedNetwork, accounts });
          }
        });
        
        if (uri) {
          showUntilAttempted(uri);
        } else {
          console.error(`[Seacrest][WalletConnect] Error: No uri returned: uri=${uri}, approval=${approval}`);
        }
      });
    });

    signClient.on("session_update", (payload) => {
      console.error(
        `[Seacrest][WalletConnect] Error: changed session.`
      );
    });

    signClient.on("session_disconnect", (payload) => {
      console.error(`[Seacrest][WalletConnect] Disconnected`);
    });
  }

  connect(resolve, reject, opts.retries);

  return promise;
}
