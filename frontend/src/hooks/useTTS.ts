import { useRef, useCallback } from 'react';

const AUDIO_FILES = {
  placeBets: '/audio/place-bets.mp3',
  stopBets: '/audio/stop-bets.mp3',
  betSuccess: '/audio/bet-success.mp3',
  playerWins: '/audio/player-wins.mp3',
  bankerWins: '/audio/banker-wins.mp3',
  tie: '/audio/tie.mp3',
} as const;

type SoundKey = keyof typeof AUDIO_FILES;

export function useTTS(muted: boolean) {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const play = useCallback((key: SoundKey) => {
    if (muted) return;

    const src = AUDIO_FILES[key];
    let audio = audioCache.current.get(src);
    if (!audio) {
      audio = new Audio(src);
      audioCache.current.set(src, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [muted]);

  return { play };
}
