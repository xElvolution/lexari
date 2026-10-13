---
title: Agent wallets
slug: wallets
group: Money
summary: Each agent holds its own onchain wallet, funded by you and bounded by your limits.
---
Lexari keeps your wallets apart:

| Wallet | Who controls it | Used for |
| --- | --- | --- |
| **Your sign-in wallet** | You | Signing in and proving it is you |
| **Your Lexari balance** | Your account, in USD | Plans, hires, usage |
| **Agent wallets** | Lexari, on your agent's behalf | The agent's own sends, trades and payments within your limits |

## One address per chain family [[testnet]]

Every agent has **one Solana address** and **one EVM address**. The EVM address is the same on Base, Ethereum, Arbitrum, Monad, HyperEVM and Tempo. Open **Wallets** to see addresses, balances in dollars and recent activity with explorer links.

## Funding and limits

You fund an agent from your balance or by sending test tokens to its address. Then you set its limits:

- **Per integration:** per trade, per day and maximum slippage.
- **Account wide:** a daily money limit across every agent send, trade, payment and wallet send.

## Withdrawals

Withdrawals go **only to wallets you have linked**, behind a fresh PIN or wallet signature. You can freeze every agent at once.

> [!WARNING]
> Agent wallets are test networks only today. Do not send real funds to an agent address. Mainnet stays paused until agents sign with policy-bound keys that cap value and allowed programs. [[soon]]
