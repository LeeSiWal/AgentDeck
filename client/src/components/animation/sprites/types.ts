export interface SpritePreset {
  name: string;
  shape: string;
  idleFrames: number[][][];
  activeFrames: number[][][];
  particleSymbols: string[];
  particleDirection: 'up' | 'down' | 'left' | 'right' | 'burst';
}

// Palette indices:
// 0 = transparent
// 1 = dark (outline, shadow)
// 2 = mid (body)
// 3 = light (highlight)
// 4 = brightest (eyes, sparkle)
