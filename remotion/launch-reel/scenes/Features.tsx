import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Theme } from "@/remotion/shared/theme";
import { DISPLAY_FONT } from "@/remotion/shared/fonts";
import { Shake, Flash } from "@/remotion/shared/Impact";

/**
 * Scene 2 — full-screen typographic takeovers: one feature per beat.
 * Giant words punch in word-by-word over a ghost number, hold, then
 * whip out as the next beat whips in. No cards — the type IS the scene.
 */
export const Features: React.FC<{
  features: string[];
  theme: Theme;
  durationInFrames: number;
}> = ({ features, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const per = durationInFrames / features.length;

  return (
    <AbsoluteFill>
      {features.map((feature, i) => {
        const start = i * per;
        const local = frame - start;
        if (local < -2 || local > per + 2) return null;
        return (
          <Beat
            key={i}
            text={feature}
            index={i}
            theme={theme}
            local={local}
            per={per}
            direction={i % 2 === 0 ? 1 : -1}
            isLast={i === features.length - 1}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Beat: React.FC<{
  text: string;
  index: number;
  theme: Theme;
  local: number;
  per: number;
  direction: 1 | -1;
  isLast: boolean;
}> = ({ text, index, theme, local, per, direction, isLast }) => {
  const { fps, width } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);

  // Whip in from the side; whip out the other way. Beat 0 enters via the
  // scene-level transition, so it skips its own whip-in.
  const WHIP = Math.min(9, per * 0.18);
  const whipIn =
    index === 0
      ? 0
      : interpolate(local, [0, WHIP], [direction * width, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const outStart = per - WHIP;
  // Last beat exits via the scene-level whip transition, not its own.
  const whipOut = isLast
    ? 0
    : interpolate(local, [outStart, per], [0, -direction * width * 0.6], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const outFade = isLast
    ? 1
    : interpolate(local, [outStart, per], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const whipBlur =
    (index === 0
      ? 0
      : interpolate(local, [0, WHIP], [18, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })) +
    (isLast
      ? 0
      : interpolate(local, [outStart, per], [0, 14], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }));

  // Word sizing: few words → huge; many → still large, wrapped.
  const wordCount = words.length;
  const fontSize = Math.max(72, Math.min(150, 1550 / Math.max(wordCount * 2.4, 5)));
  const wordStagger = Math.min(3.4, (per * 0.3) / Math.max(wordCount, 1));
  const lastLand = WHIP + wordCount * wordStagger + 4;

  // Slow push for the whole beat so the hold never sits still.
  const push = interpolate(local, [0, per], [1, 1.07], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shake/Flash read the scene-global frame, so offset by the beat start.
  const beatStart = index * per;

  return (
    <Shake delay={beatStart + lastLand} strength={9} durationInFrames={12} seed={`beat${index}`}>
      <Flash delay={beatStart + lastLand} color={theme.accentSoft} peak={0.22} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `translateX(${whipIn + whipOut}px) scale(${push})`,
          opacity: outFade,
          filter: whipBlur > 0.5 ? `blur(${whipBlur}px)` : undefined,
        }}
      >
        {/* ghost number fills the background */}
        <div
          style={{
            position: "absolute",
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 860,
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: `2px ${theme.accent}30`,
            transform: `translateX(${direction * 320}px) translateY(${local * -0.5}px)`,
            userSelect: "none",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* the feature, word by word, punching in */}
        <WordPunch
          words={words}
          delay={WHIP}
          stagger={wordStagger}
          fontSize={fontSize}
          theme={theme}
          fps={fps}
          local={local}
        />

        {/* accent underline slashes in after the last word */}
        <div
          style={{
            position: "absolute",
            bottom: "26%",
            height: 6,
            borderRadius: 3,
            width: interpolate(local, [lastLand, lastLand + 10], [0, 420], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background: `linear-gradient(90deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
            boxShadow: `0 0 40px ${theme.accent}AA`,
          }}
        />
      </AbsoluteFill>
    </Shake>
  );
};

const WordPunch: React.FC<{
  words: string[];
  delay: number;
  stagger: number;
  fontSize: number;
  theme: Theme;
  fps: number;
  local: number;
}> = ({ words, delay, stagger, fontSize, theme, fps, local }) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: "0.28em",
        rowGap: "0.06em",
        maxWidth: 1560,
        padding: "0 90px",
      }}
    >
      {words.map((word, i) => {
        const s = spring({
          frame: local - delay - i * stagger,
          fps,
          config: { damping: 12, stiffness: 260, mass: 0.6 },
        });
        // Every 3rd-ish word gets the accent gradient — rhythm without
        // needing to know which words matter.
        const accent = i % 3 === 2 || words.length === 1;
        return (
          <span
            key={i}
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize,
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              display: "inline-block",
              transform: `scale(${2.2 - s * 1.2}) translateY(${(1 - s) * 30}px)`,
              transformOrigin: "50% 70%",
              opacity: interpolate(s, [0, 0.3, 1], [0, 1, 1]),
              filter: s < 0.6 ? `blur(${(1 - s) * 6}px)` : undefined,
              ...(accent
                ? {
                    backgroundImage: `linear-gradient(120deg, ${theme.accentSoft}, ${theme.gradient[1]})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "none",
                  }
                : { color: theme.text }),
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
