import NodeWalletConnect from "@walletconnect/node";
import qrcode from "qrcode-terminal";

const networks = {
  1: "mainnet",
  5: "goerli",
  42: "kovan",
};

export async function getWalletConnector() {
  let resolve;
  let reject;
  const promise = new Promise((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });

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

  // Check if connection is already established
  if (!walletConnector.connected) {
    // Create new session
    walletConnector.createSession().then(() => {
      // Get uri for QR Code modal
      const uri = walletConnector.uri;
      console.info(`[Seacrest][WalletConnect] Please navigate to url:\n\n${uri}\n\nor visit QR code:\n`);
      qrcode.generate(uri, {small: true});
    });
  }

  // Subscribe to connection events
  walletConnector.on("connect", (error, payload) => {
    if (error) {
      reject(error);
    }

    // Get provided accounts and chainId
    const { accounts, chainId } = payload.params[0];
    const network = networks[chainId] || chainId;

    console.info(
      `[Seacrest][WalletConnect] Connected to ${network} with accounts ${JSON.stringify(
        accounts
      )}`
    );

    resolve({ walletConnector, accounts, chainId });
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

  return promise;
}
