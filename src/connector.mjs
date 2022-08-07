import NodeWalletConnect from "@walletconnect/node";
import qrcode from "qrcode-terminal";

const networks = {
  1: "mainnet",
  5: "goerli",
  42: "kovan",
};

export async function getWalletConnector(connectOpts={}) {
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

    const walletConnector = new NodeWalletConnect.default(
      {
        bridge: "https://bridge.walletconnect.org", // Required
      },
      {
        clientMeta: {
          description: "WalletConnect GitHub Action",
          url: "https://github.com/hayesgm/seacrest",
          icons: ["https://github.com/hayesgm/seacrest/logo.png"],
          name: "Seacrest",
        },
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

    // Check if connection is already established
    if (!walletConnector.connected) {
      // Create new session
      walletConnector.createSession().then(() => {
        // Get uri for QR Code modal
        const uri = walletConnector.uri;
        showUntilAttempted(uri);
      });
    }

    // Subscribe to connection events
    walletConnector.on("connect", (error, payload) => {
      attempted = true;
      if (error) {
        reject(error);
      }

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

        resolve({ walletConnector, accounts, chainId });
      }
    });

    walletConnector.on("session_update", (error, payload) => {
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

    walletConnector.on("disconnect", (error, payload) => {
      if (error) {
        reject(error);
      }
      console.error(`[Seacrest][WalletConnect] Disconnected`);
    });
  }

  connect(resolve, reject, opts.retries);

  return promise;
}
