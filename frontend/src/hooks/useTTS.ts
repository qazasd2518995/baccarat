import { useRef, useCallback, useEffect } from 'react';

const AUDIO_FILES = {
  placeBets: '/audio/place-bets.mp3',
  stopBets: '/audio/stop-bets.mp3',
  betSuccess: '/audio/bet-success.mp3',
  playerWins: '/audio/player-wins.mp3',
  bankerWins: '/audio/banker-wins.mp3',
  tie: '/audio/tie.mp3',
  chipPlace: '/audio/chip-place.mp3',
  betSuccessVoice: '/audio/bet-success-voice.mp3',
  // Dragon Tiger
  dragonWins: '/audio/dragon-wins.mp3',
  tigerWins: '/audio/tiger-wins.mp3',
  dtTie: '/audio/dt-tie.mp3',
  // Bull Bull
  bbResult: '/audio/bb-result.mp3',
} as const;

type SoundKey = keyof typeof AUDIO_FILES;

// Global unlock state — shared across all hook instances
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  // Create a silent audio context interaction to unlock autoplay
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  audioUnlocked = true;
  // Remove listeners after unlock
  document.removeEventListener('click', unlockAudio, true);
  document.removeEventListener('touchstart', unlockAudio, true);
  document.removeEventListener('keydown', unlockAudio, true);
}

// Register unlock listeners once
if (typeof document !== 'undefined') {
  document.addEventListener('click', unlockAudio, true);
  document.addEventListener('touchstart', unlockAudio, true);
  document.addEventListener('keydown', unlockAudio, true);
}

export function useTTS(muted: boolean) {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Pre-load all audio files on mount so they're ready to play
  useEffect(() => {
    for (const src of Object.values(AUDIO_FILES)) {
      if (!audioCache.current.has(src)) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audioCache.current.set(src, audio);
      }
    }
  }, []);

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
