# Lexari for Android

Native app for the Solana Mobile Clock In hackathon and for any Android phone. It lives in this folder so `landing/`, `webapp/`, and `contracts/` stay separate. It has its own `package.json` and is not part of the root npm workspaces, so `npm run build` at the repo root does not build it.

## What it does

- Sign in with Mobile Wallet Adapter (Seed Vault on Seeker and Saga, Phantom and Solflare on any Android) and with Privy Google or email when the build has a Privy app id and client id.
- Session token stays in SecureStore. The phone calls `POST /api/auth/verify?client=mobile` and sends `Authorization: Bearer` after that.
- Hub check-in and quests, agents with faces, streaming chat, confirm cards, wallet, SKR top-up, marketplace hires, calls, the agent computer, secrets, and security.
- Testnet builds show "TESTNET, not real money". Mainnet builds show "Real money · Solana mainnet".
- Seed phrases and private keys are blocked in chat.

Package ids: `ai.lexari.app` for production, `ai.lexari.app.testnet` for preview. Scheme: `lexari://`.

## Commands

```bash
cd mobileapp
npm test
npm run typecheck
npx expo start
```

A signed APK needs an Expo login. Do not put the keystore in git.

```bash
eas build -p android --profile preview
eas build -p android --profile production
```

`development` talks to https://app.lexari.ai on devnet until testnet.lexari.ai exists. `preview` points at https://testnet.lexari.ai. `production` is mainnet on https://app.lexari.ai.

## Still needs the operator

Privy Android client id, FCM (`google-services.json` as an EAS file secret), and a phone. The server changes for Bearer sessions and Expo push are in this repo and need a normal `deploy.sh` before a phone can sign in. This folder does not run that deploy.

## Preview and first-run flow

Launch order: animated splash → 3 onboarding screens (first launch only) → sign-in (Google, email, wallet) →
optional Fingerprint/Face ID + 6-digit PIN → Hub. App lock asks on open and after 15s in the background;
5 wrong PINs lock it for 30s, doubling each time. Change or turn it off in Settings.

The app targets **devnet only** for now (mainnet is paused).

```bash
cd mobileapp
npm install
npx expo start --web             # browser preview (no biometrics on web; PIN path works)
npx expo start --android         # dev build on a device/emulator (needs expo-dev-client build)
npx expo export --platform android   # bundle check
eas build -p android --profile preview   # installable APK (needs an EAS account/project)
```

Needed in the build env (never commit them): `EXPO_PUBLIC_PRIVY_APP_ID`, `EXPO_PUBLIC_PRIVY_CLIENT_ID`
(Privy app client for Android), optional `EXPO_PUBLIC_API_URL` (defaults to https://app.lexari.ai), `EAS_PROJECT_ID`.
Without Privy the Google/email buttons still show and explain politely; details go to the console only.
