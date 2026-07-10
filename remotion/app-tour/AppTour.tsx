import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import type { AppTourProps } from "@/remotion/props";
import { makeTheme } from "@/remotion/shared/theme";
import { Backdrop, LightSweep, Shockwave } from "@/remotion/shared/Backdrop";
import { Captions } from "@/remotion/shared/Captions";
import { Watermark } from "@/remotion/shared/Watermark";
import { KineticText } from "@/remotion/shared/KineticText";
import { DISPLAY_FONT, BODY_FONT } from "@/remotion/shared/fonts";

/**
 * App Tour: an intro title card, the real recorded walkthrough framed in
 * browser chrome with step-caption chips, then an outro — all wrapped in
 * the same brand-themed motion system as the other templates.
 */
export const AppTour: React.FC<AppTourProps> = (props) => {
  const theme = makeTheme(props.input.brandColor);

  return (
    <AbsoluteFill>
      <Backdrop theme={theme} seed={props.input.productName} />

      <Sequence durationInFrames={props.introFrames + 10}>
        <Intro
          productName={props.input.productName}
          tagline={props.input.tagline ?? "See it in action"}
          theme={theme}
          durationInFrames={props.introFrames}
        />
      </Sequence>

      <Sequence
        from={props.introFrames}
        durationInFrames={props.footageFrames + props.outroFrames}
      >
        <TourStage
          footageUrl={
            props.footageUrl.startsWith("http")
              ? props.footageUrl
              : staticFile(props.footageUrl)
          }
          footageFrames={props.footageFrames}
          stepCaptions={props.stepCaptions}
          theme={theme}
        />
      </Sequence>

      <Sequence from={props.introFrames + props.footageFrames}>
        <Outro
          productName={props.input.productName}
          theme={theme}
        />
      </Sequence>

      {/* narration + captions ride over the footage segment */}
      {props.audioUrl && (
        <Sequence from={props.introFrames}>
          <Audio src={props.audioUrl} />
        </Sequence>
      )}
      <Sequence from={props.introFrames}>
        <Captions pages={props.captionPages} theme={theme} />
      </Sequence>

      {props.watermark && <Watermark />}
    </AbsoluteFill>
  );
};

const Intro: React.FC<{
  productName: string;
  tagline: string;
  theme: ReturnType<typeof makeTheme>;
  durationInFrames: number;
}> = ({ productName, tagline, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const out = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", opacity: out }}
    >
      <Shockwave delay={6} color={theme.accent} size={1100} />
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: theme.accentSoft,
          marginBottom: 26,
        }}
      >
        Product Tour
      </div>
      <KineticText
        text={productName}
        stagger={4}
        style={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: 128,
          letterSpacing: "-0.03em",
          color: theme.text,
          textAlign: "center",
        }}
        wordStyle={() => ({
          backgroundImage: `linear-gradient(120deg, ${theme.text} 30%, ${theme.accentSoft} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        })}
      />
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 500,
          fontSize: 40,
          color: theme.textDim,
          marginTop: 28,
        }}
      >
        {tagline}
      </div>
    </AbsoluteFill>
  );
};

const TourStage: React.FC<{
  footageUrl: string;
  footageFrames: number;
  stepCaptions: AppTourProps["stepCaptions"];
  theme: ReturnType<typeof makeTheme>;
}> = ({ footageUrl, footageFrames, stepCaptions, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const activeStep = stepCaptions.find(
    (s) => frame >= s.fromFrame && frame < s.toFrame && s.text,
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* browser chrome frame around the recording */}
      <div
        style={{
          width: 1600,
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: `0 50px 140px rgba(0,0,0,0.6), 0 0 90px ${theme.accent}22`,
          transform: `translateY(${(1 - enter) * 70}px) scale(${0.94 + enter * 0.06})`,
          opacity: enter,
        }}
      >
        <div
          style={{
            height: 46,
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 20,
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
          ))}
          <div
            style={{
              marginLeft: 16,
              height: 24,
              width: "45%",
              borderRadius: 12,
              background: "rgba(255,255,255,0.07)",
            }}
          />
        </div>
        <Video
          src={footageUrl}
          style={{ width: 1600, display: "block" }}
        />
      </div>

      <LightSweep delay={8} durationInFrames={30} />

      {/* step caption chip */}
      {activeStep && (
        <StepChip text={activeStep.text} theme={theme} startFrame={activeStep.fromFrame} />
      )}
    </AbsoluteFill>
  );
};

const StepChip: React.FC<{
  text: string;
  theme: ReturnType<typeof makeTheme>;
  startFrame: number;
}> = ({ text, theme, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        transform: `translateY(${(1 - s) * 30}px)`,
        opacity: s,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 28px",
        borderRadius: 999,
        background: "rgba(8,8,12,0.72)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${theme.accent}66`,
        boxShadow: `0 0 40px ${theme.accent}33`,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: theme.accent,
          boxShadow: `0 0 14px ${theme.accent}`,
        }}
      />
      <span
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 600,
          fontSize: 34,
          color: theme.text,
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </span>
    </div>
  );
};

const Outro: React.FC<{
  productName: string;
  theme: ReturnType<typeof makeTheme>;
}> = ({ productName, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Shockwave delay={4} color={theme.accent} size={1200} />
      <div
        style={{
          transform: `scale(${0.9 + s * 0.1})`,
          opacity: s,
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: 104,
          letterSpacing: "-0.02em",
          color: theme.text,
          textAlign: "center",
        }}
      >
        {productName}
      </div>
      <div
        style={{
          marginTop: 24,
          fontFamily: BODY_FONT,
          fontWeight: 500,
          fontSize: 34,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: theme.textDim,
          opacity: s,
        }}
      >
        Try it yourself
      </div>
    </AbsoluteFill>
  );
};
