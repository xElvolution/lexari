import React from "react";
import { AbsoluteFill } from "remotion";
import { BODY_FONT } from "./fonts";

/** Corner bug shown only on free demo renders. */
export const Watermark: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        top: 36,
        right: 44,
        fontFamily: BODY_FONT,
        fontWeight: 600,
        fontSize: 26,
        letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.5)",
        padding: "8px 18px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(0,0,0,0.25)",
      }}
    >
      RENDERREEL · DEMO
    </div>
  </AbsoluteFill>
);
