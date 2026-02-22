import { useRef, useEffect, useCallback } from 'react';
import { BGM_PLAYLIST } from '../config/bgmPlaylist';

const BGM_VOLUME_KEY = 'bgm_enabled';

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Singleton state shared across all hook instances ──
let bgmAudio: HTMLAudioElement | null = null;
let bgmStarted = false;
let playlist: typeof BGM_PLAYLIST = [];
let currentIndex = 0;

function initPlaylist() {
  if (playlist.length === 0) {
    playlist = shuffle(BGM_PLAYLIST);
    currentIndex = 0;
  }
}

function getBgmAudio(): HTMLAudioElement {
  if (!bgmAudio) {
    initPlaylist();
    bgmAudio = new Audio(playlist[currentIndex].src);
    bgmAudio.volume = 0.3;
    bgmAudio.preload = 'auto';

    // Auto-advance to next track when current ends
    bgmAudio.addEventListener('ended', () => {
      playNext();
    });
  }
  return bgmAudio;
}

function playNext() {
  if (!bgmAudio) return;
  currentIndex++;
  if (currentIndex >= playlist.length) {
    // Re-shuffle and restart
    playlist = shuffle(BGM_PLAYLIST);
    currentIndex = 0;
  }
  bgmAudio.src = playlist[currentIndex].src;
  bgmAudio.play().catch(() => {});
}

function loadBgmEnabled(): boolean {
  try {
    const stored = localStorage.getItem(BGM_VOLUME_KEY);
    if (stored !== null) return stored === 'true';
  } catch {}
  return true; // default: enabled
}

function saveBgmEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BGM_VOLUME_KEY, String(enabled));
  } catch {}
}

export function useBackgroundMusic(muted: boolean) {
  const bgmEnabledRef = useRef(loadBgmEnabled());

  // Start BGM on first user interaction (autoplay policy)
  useEffect(() => {
    const audio = getBgmAudio();

    const tryPlay = () => {
      if (bgmStarted || muted || !bgmEnabledRef.current) return;
      audio.play().then(() => {
        bgmStarted = true;
      }).catch(() => {});
    };

    // Try to play immediately
    tryPlay();

    // Also listen for user interaction to start
    const handler = () => tryPlay();
    document.addEventListener('click', handler, { once: false });
    document.addEventListener('touchstart', handler, { once: false });

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [muted]);

  // Sync muted state
  useEffect(() => {
    const audio = getBgmAudio();
    if (muted || !bgmEnabledRef.current) {
      audio.pause();
    } else if (bgmStarted) {
      audio.play().catch(() => {});
    }
  }, [muted]);

  const toggleBgm = useCallback(() => {
    const audio = getBgmAudio();
    const newEnabled = !bgmEnabledRef.current;
    bgmEnabledRef.current = newEnabled;
    saveBgmEnabled(newEnabled);

    if (newEnabled && !muted) {
      audio.play().then(() => {
        bgmStarted = true;
      }).catch(() => {});
    } else {
      audio.pause();
    }

    return newEnabled;
  }, [muted]);

  const skipTrack = useCallback(() => {
    if (!bgmStarted) return;
    playNext();
  }, []);

  // NO unmount cleanup — music continues across page navigation

  return {
    toggleBgm,
    skipTrack,
    isBgmEnabled: bgmEnabledRef.current,
  };
}
