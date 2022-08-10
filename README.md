# Seacrest

<img src="https://github.com/hayesgm/seacrest/raw/main/logo.png" width="100">

----
Seacrest allows you to connect with WalletConnect from your terminal or GitHub Action.

You start Seacrest either in a terminal or as a GitHub Action. In either case, you'll see a QR Code in your terminal after Seacrest starts [like literally, in your terminal or in the GitHub Actions logs]. Connect any WalletConnect app (e.g. [MetaMask Mobile](https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202)) to that QR Code. From then on out, point your apps to the Ethereum node `https://localhost:8585`. For standard requests, like the current block number, Seacrest proxies the request to an Ethereum node you specify. But for requests for unlocked accounts or signing transactions, Seacrest will forward the request to your WalletConnect app. Magically, you'll have an "unlocked account" available to use with Hardhat or any other Ethereum tool.

## Installing

### Terminal

To run Seacrest, install it through npm or yarn:

```sh
npm install -g seacrest
```

Next, run seacrest, specifying an Ethereum node to proxy requests to:

```sh
seacrest http://goerli.infura.io 8585
```

Now, you can specify `http://localhost:8585` as your Ethereum node in any service. If that service requests..

### GitHub Actions

Seacrest is also meant to be easily used in a GitHub Action. Add to your YAML file:

```yaml
- name: Seacrest
  uses: hayesgm/seacrest@v1
  with:
    ethereum_url: https://goerli.infura.io
    port: 8585
```

You will need to pull into your logs *when the action is running* and connect your wallet. Pull into the action log and scan the QR code. It's a little finnicky, but it should work.

Subsequently, you can simply use `http://localhost:8585` as your Ethereum node. Any requests for accounts or signatures will be redirected to WalletConnect. For instance, you could deploy scripts from Hardhat using this node, with the security of WalletConnect but the ease and transparency of GitHub Actions.

## Why?

First, for fun and profit. But moreso, there's value in interacting and deploying Ethereum contracts in plain sight. But that's hard to do since most people don't want to share private keys with GitHub Secrets, even if they are throwaways. This gives developers the option to securely sign transactions _in public_.

Secondly, you could use this as an authorization flow in GitHub Actions, e.g. to unlock other secrets or anything else. It is the first "human in the loop" authorization action that I know of.

## Contributing

Create a PR to contribute to Seacrest. All contributors agree to accept the license specified in this repository for all contributions to this project. See [LICENSE.md](/LICENSE.md).

Feel free to create Feature Requests in the issues.

Note: The author generated the Seacrest logo with DALL•E, OpenAI's text-to-image generation model. The image was further modified by the author.
