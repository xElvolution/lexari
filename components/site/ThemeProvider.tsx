"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import { AuthProvider } from "./Auth";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
      <AuthProvider>{children}</AuthProvider>
    </NextThemes>
  );
}
