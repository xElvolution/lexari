import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { StatClipProps } from "@/remotion/props";
import { makeTheme, type Theme } from "@/remotion/shared/theme";
import { Backdrop } from "@/remotion/shared/Backdrop";
import { Captions } from "@/remotion/shared/Captions";
import { Watermark } from "@/remotion/shared/Watermark";
import { KineticText } from "@/remotion/shared/KineticText";
import { DISPLAY_FONT, BODY_FONT } from "@/remotion/shared/fonts";
import type { StatItem } from "@/lib/schemas";

export const StatClip: React.FC<StatClipProps> = (props) => {
  const theme = makeTheme(props.input.brandColor);
  const byId = Object.fromEntries(props.scenes.map((s) => [s.id, s]));
  const intro = byId["intro"];
  const numbers = byId["numbers"];
  const outro = byId["outro"];

  return (
    <AbsoluteFill>
      <Backdrop theme={theme} seed={props.input.title} />

      {intro && (
        <Sequence from={intro.from} durationInFrames={intro.durationInFrames + 6}>
          <TitleCard title={props.input.title} theme={theme} />
        </Sequence>
      )}

      {numbers && (
        <Sequence from={numbers.from} durationInFrames={(outro ? numbers.durationInFrames : props.durationInFrames - numbers.from) + 6}>
          <CounterGrid stats={props.input.stats} theme={theme} />
        </Sequence>
      )}

      {outro && (
        <Sequence from={outro.from} durationInFrames={outro.durationInFrames}>
          <OutroSting title={props.input.title} theme={theme} />
        </Sequence>
      )}

      <Captions pages={props.captionPages} theme={theme} />
      {props.audioUrl && <Audio src={props.audioUrl} />}
      {props.watermark && <Watermark />}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ title: string; theme: Theme }> = ({ title, theme }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 140 }}>
    <KineticText
      text={title}
      delay={2}
      stagger={3}
      style={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 700,
        fontSize: 108,
        letterSpacing: "-0.025em",
        lineHeight: 1.08,
        textAlign: "center",
        color: theme.text,
      }}
      wordStyle={() => ({
        backgroundImage: `linear-gradient(120deg, ${theme.text} 35%, ${theme.accentSoft})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      })}
    />
  </AbsoluteFill>
);

const CounterGrid: React.FC<{ stats: StatItem[]; theme: Theme }> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = stats.length <= 2 ? stats.length : stats.length <= 4 ? 2 : 3;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 40,
          width: cols === 1 ? 760 : cols === 2 ? 1240 : 1560,
        }}
      >
        {stats.map((stat, i) => {
          const delay = 5 + i * 6;
          const s = spring({
            frame: frame - delay,
            fps,
            config: { damping: 16, stiffness: 100 },
          });
          const counted = countTo(stat.value, frame - delay, fps);
          const deltaPositive = (stat.delta ?? 0) >= 0;
          return (
            <div
              key={i}
              style={{
                padding: "52px 48px",
                borderRadius: 30,
                background: `linear-gradient(150deg, ${theme.surface}F5, ${theme.bgSoft}E8)`,
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 30px 90px rgba(0,0,0,0.4)",
                transform: `translateY(${(1 - s) * 110}px) scale(${0.92 + s * 0.08})`,
                opacity: interpolate(s, [0, 0.3, 1], [0, 1, 1]),
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 600,
                  fontSize: 30,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: theme.textDim,
                }}
              >
                {stat.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: 96,
                    letterSpacing: "-0.03em",
                    color: theme.text,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatValue(counted, stat.value)}
                  {stat.unit && (
                    <span style={{ fontSize: 56, color: theme.accentSoft, marginLeft: 6 }}>
                      {stat.unit}
                    </span>
                  )}
                </span>
                {stat.delta !== undefined && (
                  <span
                    style={{
                      fontFamily: BODY_FONT,
                      fontWeight: 800,
                      fontSize: 34,
                      color: deltaPositive ? "#3DDC97" : "#FF6B6B",
                    }}
                  >
                    {deltaPositive ? "▲" : "▼"} {Math.abs(stat.delta)}
                  </span>
                )}
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  width: `${Math.round(s * 100)}%`,
                  background: `linear-gradient(90deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                  boxShadow: `0 0 24px ${theme.accent}66`,
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const OutroSting: React.FC<{ title: string; theme: Theme }> = ({ title, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: 64,
          color: theme.textDim,
          transform: `scale(${0.94 + s * 0.06})`,
          opacity: s,
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};

/** Spring-eased count-up that always lands exactly on the target. */
function countTo(target: number, frame: number, fps: number): number {
  const progress = spring({
    frame,
    fps,
    config: { damping: 26, stiffness: 60 },
    durationInFrames: Math.round(fps * 1.4),
  });
  return target * progress;
}

function formatValue(current: number, target: number): string {
  const decimals =
    Math.abs(target) < 10 && !Number.isInteger(target) ? 1 : 0;
  return current.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
