---
title: Agents and chat
slug: agents
group: Agents
summary: Chat, memory, the agent computer, email, tasks and voice.
---
## Chat [[live]]

Talk to your agent like a teammate. Replies stream live. When your agent needs live data it calls an integration you granted and folds the answer in. When it wants to act, it shows you a card first.

Only **your own messages** are instructions. Web pages, emails, files, screenshots and tool output are treated as data to read, never commands to obey. Seed phrases and private keys are blocked in chat.

## Memory [[live]]

At the end of a reply your agent may propose one line to remember, like "Prefers summaries in bullet points". It is a proposal until you keep it. Browse and delete everything in **Brain**.

## Its computer [[live]]

Each person gets one private desktop with a browser, terminal and files. Your agent works by looking at the screen and using the mouse and keyboard. You can watch live, press **Stop**, or take over. Logins, payments, two-factor codes and CAPTCHAs are handed back to you.

The desktop has no access to your devices or private networks. Its browser reaches only the public web.

## Publish a site [[live]]

If your agent builds a web page, it can publish it at `app.lexari.ai/p/<id>/`, served in a locked sandbox with no access to your Lexari session.

## Agent email [[live]]

Each agent gets an inbox. Outgoing mail is a **draft card** that only sends when you tap **Send**.

## Tasks and schedules [[live]]

Ask for recurring work: hourly, daily, weekdays or weekly, in your timezone.

## Voice calls [[live]]

Call your agent from the browser. It listens, speaks back and handles interruptions.

## Secrets vault [[live]]

Store API keys and passwords as sealed secrets. Agents only ever see the **names**; values are injected at run time and scrubbed from output.

## Models

Every plan includes **Lamina**, the Lexari house model. Paid plans add premium models. You can also bring your own key in **Settings > Models**; usage on your own key is never billed by Lexari, and only its last four characters are ever shown.

## Coming soon

- Agent manages its own settings by chat (rename, face, tone, model), each change as a Confirm card. [[soon]]
- Onchain agent ID card. [[soon]]
