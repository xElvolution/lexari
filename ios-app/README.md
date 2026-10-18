# Lexari for iPhone

Standalone iOS-only Expo app (SDK 57) with the iOS 26 Liquid Glass look. Same features, backend and endpoints as the Android app in `../mobileapp`. Bundle id `ai.lexari.app.testnet`. Scheme `lexari://`.

```bash
<<<<<<< Updated upstream
cd android-app
npm test
npm run typecheck
npx expo start
```

A signed APK needs an Expo login. Do not put the keystore in git.

```bash
eas build -p android --profile preview
eas build -p android --profile production
```

`development` and `preview` talk to https://app.lexari.ai on devnet. `production` is mainnet on https://app.lexari.ai.

The Privy app id and app client id are public and sit in each `eas.json` profile (`EXPO_PUBLIC_PRIVY_APP_ID`, `EXPO_PUBLIC_PRIVY_CLIENT_ID`). The Privy dashboard allows the app identifiers `ai.lexari.app.testnet` and `ai.lexari.app` and the URL scheme `lexari`.

## Still needs the operator

FCM (`google-services.json` as an EAS file secret), and a phone.

## Preview and first-run flow

Launch order: animated splash → 3 onboarding screens (first launch only) → sign-in (Google, email, wallet) →
optional Fingerprint/Face ID + 6-digit PIN → Hub. App lock asks on open and after 15s in the background;
5 wrong PINs lock it for 30s, doubling each time. Change or turn it off in Settings.

The app targets **devnet only** for now (mainnet is paused).

```bash
cd android-app
=======
cd ios-app
>>>>>>> Stashed changes
npm install
npm run typecheck
npx expo-doctor
npm run prebuild:ios     # writes ios/, which is gitignored
npm run preview:web      # 390x844 browser preview, glass falls back to blur
```

See [IOS.md](./IOS.md) for TestFlight and App Store steps.
