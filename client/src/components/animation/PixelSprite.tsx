import { useState, useEffect } from 'react';
import type { SpritePreset } from './sprites/types';

interface PixelSpriteProps {
  preset: SpritePreset;
  palette: string[];
  state: 'idle' | 'active';
  size: number;
  glow?: boolean;
  glowColor?: string;
  className?: string;
}

export function PixelSprite({ preset, palette, state, size, glow, glowColor, className }: PixelSpriteProps) {
  const frames = state === 'active' ? preset.activeFrames : preset.idleFrames;
  const fps = state === 'active' ? 8 : 4;
  const [frameIdx, setFrameIdx] = useState(0);
  const pixelSize = size / 16;

  useEffect(() => {
    if (frames.length <= 1) return;
    const interval = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [frames.length, fps]);

  useEffect(() => { setFrameIdx(0); }, [state]);

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{
        imageRendering: 'pixelated',
        filter: glow ? `drop-shadow(0 0 ${pixelSize * 2}px ${glowColor || palette[2]})` : undefined,
        transition: 'filter 0.3s ease',
      }}
    >
      {frames[frameIdx]?.map((row, y) =>
        row.map((ci, x) => ci === 0 ? null : (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ci] || palette[2]} />
        ))
      )}
    </svg>
  );
}
