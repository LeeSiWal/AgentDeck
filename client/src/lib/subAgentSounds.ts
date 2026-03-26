export {
  playSubAgentSpawn,
  playSubAgentComplete,
  playSubAgentError,
  playAgentStart,
  playAgentStop,
  playToolRead,
  playToolWrite,
  playToolBash,
  playToolSearch,
  playToolThink,
} from './soundManager';

import * as sm from './soundManager';

const TOOL_SOUNDS: Record<string, () => void> = {
  read: sm.playToolRead,
  write: sm.playToolWrite,
  bash: sm.playToolBash,
  search: sm.playToolSearch,
  think: sm.playToolThink,
};

export function playToolSound(type: string) {
  const fn = TOOL_SOUNDS[type];
  if (fn) fn();
  else sm.playSubAgentSpawn();
}
