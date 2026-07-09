import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Word-by-word kinetic reveal: each word springs up from a clipped
 * baseline with a slight rotation, staggered.
 */
export const KineticText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  wordStyle?: (word: string, i: number) => React.CSSProperties;
}> = ({ text, delay = 0, stagger = 3, style, wordStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: "0.32em",
        rowGap: "0.1em",
        ...style,
      }}
    >
      {words.map((word, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 16, stiffness: 130, mass: 0.7 },
        });
        return (
          <span
            key={i}
            style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - s) * 105}%) rotate(${(1 - s) * -4}deg)`,
                opacity: interpolate(s, [0, 0.35, 1], [0, 1, 1]),
                ...(wordStyle ? wordStyle(word, i) : {}),
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Fade+rise for secondary text blocks. */
export const Rise: React.FC<{
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, distance = 28, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 110, mass: 0.8 },
  });
  return (
    <div
      style={{
        transform: `translateY(${(1 - s) * distance}px)`,
        opacity: s,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
