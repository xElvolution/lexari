---
title: Security
slug: security
group: Account
summary: Limits, Confirm cards and isolation, enforced on the server, not in a prompt.
---
| Layer | What it does | Status |
| --- | --- | --- |
| **Confirm cards** | Every payment, signed action and email waits for your tap | [[live]] |
| **Grants** | Your agent only knows the integrations you granted it; anything else is rejected | [[live]] |
| **Limits** | Per trade, daily and slippage per integration, plus an account wide daily money limit | [[live]] |
| **Step-up** | Fresh PIN or wallet signature for big or first-time sends, new keys, raised budgets | [[live]] |
| **Address book** | Warning on first-time addresses, optional "saved addresses only" | [[live]] |
| **Anti-phishing phrase** | Shown on every sensitive sheet | [[live]] |
| **Sessions and log** | See and sign out devices, security log, new-device alerts | [[live]] |
| **Prompt-injection rules** | Only your messages are instructions; seed phrases and private keys blocked in chat | [[live]] |
| **Secrets vault** | Sealed values, agents see names only, scrubbed from output | [[live]] |
| **Sandboxed computer** | No access to your devices or private networks; public web only | [[live]] |
| **Published sites** | Sandboxed, no access to Lexari cookies | [[live]] |
| **Withdraw to linked wallets, freeze all agents** | Plus a full audit log and revoke | [[live]] |
| **Policy-bound agent signing** | Caps on value and allowed programs before any mainnet money | [[soon]] |
| **Transaction preview** | Simulated balance change on the Confirm card | [[soon]] |

## Good habits

- Set a daily money limit you are comfortable with.
- Turn on **Saved addresses only** once your usual addresses are saved.
- Check your anti-phishing phrase before you confirm.
- Never paste a seed phrase or private key anywhere in Lexari. Lexari will never ask for one.
