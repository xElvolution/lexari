import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Lexari for iPhone. A standalone iOS-only Expo project (the Android app lives in ../android-app).
 * Same backend and endpoints as Android. Testnet bundle id until mainnet reopens.
 * LEXARI_WEB_PREVIEW=1 adds the web platform only for the 390x844 screenshot preview; store builds are iOS only.
 */
const bundleIdentifier = process.env.IOS_BUNDLE_ID || "ai.lexari.app.testnet";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Lexari",
  slug: "lexari",
  scheme: "lexari",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  platforms: process.env.LEXARI_WEB_PREVIEW === "1" ? ["ios", "web"] : ["ios"],
  icon: "./assets/icon.png",
  web: { favicon: "./assets/favicon.png" },
  ios: {
    bundleIdentifier,
    buildNumber: "1",
    supportsTablet: false,
    icon: "./assets/icon.png",
    associatedDomains: ["webcredentials:app.lexari.ai", "applinks:app.lexari.ai"],
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSFaceIDUsageDescription: "Lexari uses Face ID to unlock the app and to confirm your passkey.",
      NSCameraUsageDescription: "Lexari uses the camera to take your profile picture and to scan wallet QR codes.",
      NSPhotoLibraryUsageDescription: "Lexari uses your photos to set your profile picture and cover.",
      NSPhotoLibraryAddUsageDescription: "Lexari saves images your agent makes to your photos when you ask.",
      NSMicrophoneUsageDescription: "Lexari uses the microphone for voice notes and calls with your agent.",
      NSSpeechRecognitionUsageDescription: "Lexari turns what you say on a call into text for your agent.",
      UIBackgroundModes: ["remote-notification"],
    },
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-secure-store",
    "expo-apple-authentication",
    ["expo-notifications", { color: "#5b2bff" }],
    ["expo-local-authentication", { faceIDPermission: "Lexari uses Face ID to unlock the app and to confirm your passkey." }],
    ["expo-audio", { microphonePermission: "Lexari uses the microphone for voice notes and calls with your agent." }],
    ["expo-speech-recognition", { microphonePermission: "Lexari uses the microphone for calls with your agent.", speechRecognitionPermission: "Lexari turns what you say on a call into text for your agent." }],
    ["expo-image-picker", { photosPermission: "Lexari uses your photos to set your profile picture and cover.", cameraPermission: "Lexari uses the camera to take your profile picture and to scan wallet QR codes.", microphonePermission: false }],
    ["expo-splash-screen", { backgroundColor: "#14072e", image: "./assets/splash-icon.png", imageWidth: 96, dark: { backgroundColor: "#14072e", image: "./assets/splash-icon.png" } }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://app.lexari.ai",
    cluster: "devnet", // mainnet is paused: devnet only for now
    programId: process.env.EXPO_PUBLIC_LEXARI_PROGRAM_ID || "BbnD28xf3kwfQRiRA6VQmw4p2R55WivUgozSoo81M6Po",
    privyAppId: process.env.EXPO_PUBLIC_PRIVY_APP_ID || "",
    privyClientId: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID || "",
    skrMint: process.env.EXPO_PUBLIC_SKR_MINT || "",
    usdcMint: process.env.EXPO_PUBLIC_USDC_MINT || "",
    eas: { projectId: process.env.EAS_PROJECT_ID || "" },
  },
});
