# mm-plugin-lexari

A MetaMask Agent Wallet (`mm`) plugin for Lexari, personalized AI agents that act onchain.

| Command | What it does | Capabilities |
| --- | --- | --- |
| `mm lexari balance [address] --chain-id 10143` | MON and Agora AUSD held by your wallet or a Lexari agent on Monad | `wallet-read` |
| `mm lexari fund <agent> <amount> --asset MON\|AUSD` | Fund one of your Lexari agents from Agent Wallet | `wallet-read`, `wallet-submit` |
| `mm lexari trade --from USDC --from-chain base --to USDC --to-chain sol --amount 10 --recipient <agent>` | Trade across chains through Aurora Intents. Live quote first; `--dry` for quote only | `wallet-read`, `wallet-submit` |

Every transaction goes through the Agent Wallet executor, so you approve it in Agent Wallet. Nothing signs on its own.
`lexari trade` needs `AURORA_INTENTS_API_KEY` (from studio.aurora.dev) in the environment.

## Build and try it

```
npm install
npm run build
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true
mm plugins install "file:$PWD" --accept-permissions
mm lexari balance --chain-id 10143
```

Requires Node.js 22.18 or later and `@metamask/agent-wallet` ^6.2.0.
