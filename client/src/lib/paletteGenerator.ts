const COLOR_POOL = [
  { name: 'blue',    hue: 220, base: '#3B82F6' },
  { name: 'amber',   hue: 38,  base: '#F59E0B' },
  { name: 'emerald', hue: 160, base: '#10B981' },
  { name: 'violet',  hue: 270, base: '#8B5CF6' },
  { name: 'pink',    hue: 330, base: '#EC4899' },
  { name: 'cyan',    hue: 190, base: '#06B6D4' },
  { name: 'orange',  hue: 25,  base: '#F97316' },
  { name: 'teal',    hue: 170, base: '#14B8A6' },
  { name: 'red',     hue: 0,   base: '#EF4444' },
  { name: 'lime',    hue: 80,  base: '#84CC16' },
  { name: 'indigo',  hue: 245, base: '#6366F1' },
  { name: 'rose',    hue: 350, base: '#F43F5E' },
];

export function generatePalette(hue: number): string[] {
  return [
    'transparent',
    `hsl(${hue}, 70%, 30%)`,
    `hsl(${hue}, 70%, 50%)`,
    `hsl(${hue}, 70%, 70%)`,
    `hsl(${hue}, 70%, 88%)`,
  ];
}

export function assignAgentColor(existingHues: number[]): {
  hue: number;
  palette: string[];
  glowColor: string;
  name: string;
} {
  let bestColor = COLOR_POOL[0];
  let maxDistance = -1;

  for (const color of COLOR_POOL) {
    const minDist = existingHues.length === 0
      ? Infinity
      : Math.min(...existingHues.map(h => {
          const diff = Math.abs(color.hue - h);
          return Math.min(diff, 360 - diff);
        }));
    if (minDist > maxDistance) {
      maxDistance = minDist;
      bestColor = color;
    }
  }

  return {
    hue: bestColor.hue,
    palette: generatePalette(bestColor.hue),
    glowColor: bestColor.base,
    name: bestColor.name,
  };
}

export function getColorByHue(hue: number): { palette: string[]; glowColor: string; name: string } {
  const match = COLOR_POOL.reduce((closest, c) => {
    const diff = Math.abs(c.hue - hue);
    const dist = Math.min(diff, 360 - diff);
    const closestDiff = Math.abs(closest.hue - hue);
    const closestDist = Math.min(closestDiff, 360 - closestDiff);
    return dist < closestDist ? c : closest;
  }, COLOR_POOL[0]);

  return {
    palette: generatePalette(hue),
    glowColor: match.base,
    name: match.name,
  };
}
