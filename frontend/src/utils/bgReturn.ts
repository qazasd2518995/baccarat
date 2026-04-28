const BG_RETURN_URL_STORAGE_KEY = 'bg_return_url';
const FALLBACK_BG_LOBBY_URL = 'https://bg-web-ny73.onrender.com/lobby';

function normalizeReturnUrl(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.origin === window.location.origin) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveLaunchReturnUrl(params: URLSearchParams): string | null {
  return (
    normalizeReturnUrl(params.get('returnUrl')) ??
    normalizeReturnUrl(document.referrer) ??
    normalizeReturnUrl(import.meta.env.VITE_BG_LOBBY_URL as string | undefined) ??
    FALLBACK_BG_LOBBY_URL
  );
}

export function saveBgReturnUrl(url: string | null): void {
  if (!url) return;
  localStorage.setItem(BG_RETURN_URL_STORAGE_KEY, url);
}

export function getBgReturnUrl(): string {
  return (
    normalizeReturnUrl(localStorage.getItem(BG_RETURN_URL_STORAGE_KEY)) ??
    normalizeReturnUrl(import.meta.env.VITE_BG_LOBBY_URL as string | undefined) ??
    FALLBACK_BG_LOBBY_URL
  );
}

export function openBgLobby(): void {
  const url = getBgReturnUrl();
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // Fall through to a normal top-level navigation.
  }
  window.open(url, '_top');
}
