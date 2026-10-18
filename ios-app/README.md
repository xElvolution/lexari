# Lexari for iPhone

Standalone iOS-only Expo app (SDK 57) with the iOS 26 Liquid Glass look. Same features, backend and endpoints as the Android app in `../android-app`. Bundle id `ai.lexari.app.testnet`. Scheme `lexari://`.

```bash
cd ios-app
npm install
npm run typecheck
npx expo-doctor
npm run prebuild:ios     # writes ios/, which is gitignored
npm run preview:web      # 390x844 browser preview, glass falls back to blur
```

See [IOS.md](./IOS.md) for TestFlight and App Store steps.
