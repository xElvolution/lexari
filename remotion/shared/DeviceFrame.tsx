import React from "react";
import { Img } from "remotion";
import type { ScreenshotAsset } from "@/remotion/props";
import type { Theme } from "./theme";

/**
 * Aspect-aware presentation of a user screenshot:
 * - phone  → rounded device shell
 * - desktop → browser chrome with traffic lights
 * - square → clean card
 * All variants sit on a soft brand glow.
 */
export const DeviceFrame: React.FC<{
  asset: ScreenshotAsset;
  theme: Theme;
  maxWidth: number;
  maxHeight: number;
}> = ({ asset, theme, maxWidth, maxHeight }) => {
  const fit = fitWithin(asset.width, asset.height, maxWidth, maxHeight);

  const shell: React.CSSProperties = {
    position: "relative",
    borderRadius: asset.aspect === "phone" ? 44 : 18,
    overflow: "hidden",
    boxShadow: `0 40px 120px rgba(0,0,0,0.55), 0 0 90px ${theme.accent}2e`,
    border: "1px solid rgba(255,255,255,0.12)",
    background: theme.surface,
  };

  return (
    <div style={{ width: fit.width, height: fit.height + (asset.aspect === "desktop" ? 44 : 0), ...shell }}>
      {asset.aspect === "desktop" && (
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 18,
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
          ))}
          <div
            style={{
              marginLeft: 14,
              height: 22,
              flexGrow: 0,
              width: "42%",
              borderRadius: 11,
              background: "rgba(255,255,255,0.07)",
            }}
          />
        </div>
      )}
      <Img
        src={asset.url}
        style={{ width: fit.width, height: fit.height, objectFit: "cover", display: "block" }}
      />
    </div>
  );
};

function fitWithin(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
