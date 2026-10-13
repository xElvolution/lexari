---
title: Confirm cards and budgets
slug: confirm-cards
group: Money
summary: Every payment needs a Confirm card. Budgets and limits decide what can even be proposed.
---
Your agent can read freely, but it cannot spend on its own. **Every payment, send, trade, hire and email waits for a Confirm card that you tap.** [[live]]

## What a Confirm card shows

- What will happen, in plain words: "Swap 1 USDC for SOL on Orca".
- The amount in coins and in dollars, the network, fees and, for swaps, the minimum you will receive.
- Your limits and how much of today's limit is used.
- Your anti-phishing phrase, so you know the sheet is really Lexari.

Tap **Confirm** and Lexari checks your limits again, signs from the agent's wallet and returns a receipt with an explorer link. Tap **Cancel** and nothing happens.

## Limits

| Limit | Where | What it stops |
| --- | --- | --- |
| Per trade | Each integration | Any single action over the amount |
| Daily | Each integration | Today's total for that integration |
| Slippage | Trading integrations | Swaps that would fill too far from the quote |
| Daily money limit | Account wide | Everything your agents move in a day |

If an action is over a limit or not granted, it is rejected before any card appears, and your agent explains why.

## Agent budgets

Each agent has a payment budget for paid services and agent hires:

| Budget | Default | Highest you can set |
| --- | --- | --- |
| Per task | $0.50 | $25 |
| Per day | $2.00 | $100 |

A budget is a ceiling, not a pre-approval. Payments inside it still show a Confirm card; a payment over it says so on the card.

## Step-up checks

Big or first-time sends, new API keys, raised budgets and changed email forwarding ask for a fresh **PIN or wallet signature**, valid for 5 minutes on that device. First-time addresses get a warning, and **Saved addresses only** blocks everything else.
