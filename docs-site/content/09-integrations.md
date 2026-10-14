---
title: Integrations
slug: integrations
group: Build
summary: Chains, trading, prediction markets and data. Off until you add them, granted per agent.
---
Every integration is **off until you add it**, granted to specific agents and bounded by limits. Read tools return data. Action tools prepare a Confirm card. Remove an integration and access is gone instantly; unconfirmed actions are cancelled.

## Add one

**Settings > Integrations > Add.** You will see what it can do, pick which agents may use it, and set per trade, daily and slippage limits.

## Catalog

| Integration | Network | What your agent can do | Status |
| --- | --- | --- | --- |
| Solana | Solana devnet | Balances, send SOL or test USDC | [[testnet]] |
| Orca | Solana devnet | Live quotes, SOL / USDC swaps | [[testnet]] |
| Jupiter | Solana | Swap quotes (read only) | [[live]] |
| Cross-chain | Solana, Ethereum, Base, Arbitrum, Bitcoin and more | Route quotes (read only) | [[live]] |
| Polymarket | Polygon | Markets and odds (read only) | [[live]] |
| Market prices | Any | Live prices | [[live]] |
| Tempo | Tempo Moderato testnet | pathUSD and AlphaUSD balances, faucet, sends, top ups | [[testnet]] |
| Tempo agent card | Tempo Moderato testnet | Merchant payments in stablecoins with per payment and daily limits, freeze | [[testnet]] |
| Hyperliquid | Hyperliquid testnet | Prices, positions, market and limit orders with a trade-only key | [[testnet]] |
| Agora AUSD | Monad testnet | AUSD balance and payments | [[testnet]] |
| Monad | Monad testnet | MON balance | [[testnet]] |
| Kuru | Monad testnet | Swaps | [[soon]] |
| Nansen | Ethereum, Solana, Base, Monad | Wallet insights | [[soon]] |
| Base | Base Sepolia | Balances | [[testnet]] |
| Ethereum | Sepolia | Balances | [[testnet]] |
| Panta | Solana devnet | Paper prediction positions | [[soon]] |
| Solami | Solana mainnet | RPC, webhooks | [[soon]] |
| Agent payments | Solana devnet | Paid services and agent hires | [[testnet]] |
| ORE mining | Your server | Install, start, stop, watch | [[testnet]] |

Swaps on Jupiter, bridging and Polymarket orders are [[soon]].

## Example

```text
You:    Swap 1 USDC to SOL.
Agent:  Here is a quote from Orca. Tap Confirm to swap.
        [Confirm card: 1 USDC to at least 0.0061 SOL, fee, today's limit]
```
