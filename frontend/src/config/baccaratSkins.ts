export type BaccaratSkinId = 'royal' | 'nova' | 'imperial';

export interface BaccaratSkin {
  id: BaccaratSkinId;
  gameId: string;
  provider: string;
  brand: string;
  shortBrand: string;
  english: string;
  logoText: string;
  lobbyTitle: string;
  tableLabel: string;
  rootClass: string;
  sidebarClass: string;
  topbarClass: string;
  cardClass: string;
  accentTextClass: string;
  badgeClass: string;
  buttonActiveClass: string;
  buttonIdleClass: string;
  tableHoverClass: string;
  gameHeaderClass: string;
  tableSurfaceClass: string;
  fontFamily: string;
}

export const BACCARAT_SKINS: Record<BaccaratSkinId, BaccaratSkin> = {
  royal: {
    id: 'royal',
    gameId: 'baccarat',
    provider: 'Royal Crown Studios',
    brand: '皇家百家',
    shortBrand: '皇家',
    english: 'ROYAL BACCARAT',
    logoText: 'RB',
    lobbyTitle: '皇家真人館',
    tableLabel: '皇家百家',
    rootClass: 'bg-[#1a1f2e] text-white',
    sidebarClass: 'bg-[#141922] border-gray-800/50',
    topbarClass: 'bg-[#0d1117] border-gray-800/50',
    cardClass: 'bg-[#0a0e14] border-[#1a2030]',
    accentTextClass: 'text-amber-400',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black',
    buttonActiveClass: 'bg-[#2a3548] text-white',
    buttonIdleClass: 'text-gray-500 hover:text-gray-300',
    tableHoverClass: 'hover:border-[#d4af37]',
    gameHeaderClass: 'bg-[#10151f] border-gray-800/60',
    tableSurfaceClass: 'from-emerald-950 via-green-900 to-emerald-950',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  nova: {
    id: 'nova',
    gameId: 'baccarat-nova',
    provider: 'Nova Live',
    brand: '星耀百家',
    shortBrand: '星耀',
    english: 'NOVA LIVE',
    logoText: 'NV',
    lobbyTitle: '星耀影棚',
    tableLabel: '星耀百家',
    rootClass: 'bg-[#07151d] text-cyan-50',
    sidebarClass: 'bg-[#08111b] border-cyan-900/40',
    topbarClass: 'bg-[#061018] border-cyan-900/40',
    cardClass: 'bg-[#07111b] border-cyan-900/40',
    accentTextClass: 'text-cyan-300',
    badgeClass: 'bg-gradient-to-r from-cyan-400 to-violet-400 text-slate-950',
    buttonActiveClass: 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/30',
    buttonIdleClass: 'text-cyan-200/48 hover:text-cyan-100',
    tableHoverClass: 'hover:border-cyan-300',
    gameHeaderClass: 'bg-[#07131c] border-cyan-900/50',
    tableSurfaceClass: 'from-cyan-950 via-slate-900 to-violet-950',
    fontFamily: '"Trebuchet MS", system-ui, sans-serif',
  },
  imperial: {
    id: 'imperial',
    gameId: 'baccarat-imperial',
    provider: 'Imperial Dragon',
    brand: '御龍百家',
    shortBrand: '御龍',
    english: 'IMPERIAL DRAGON',
    logoText: 'ID',
    lobbyTitle: '御龍牌桌',
    tableLabel: '御龍百家',
    rootClass: 'bg-[#190b0b] text-amber-50',
    sidebarClass: 'bg-[#160909] border-red-950/60',
    topbarClass: 'bg-[#120707] border-red-950/60',
    cardClass: 'bg-[#120808] border-red-900/50',
    accentTextClass: 'text-[#f6c863]',
    badgeClass: 'bg-gradient-to-r from-red-700 to-amber-500 text-white',
    buttonActiveClass: 'bg-red-950/70 text-amber-100 ring-1 ring-amber-300/30',
    buttonIdleClass: 'text-amber-100/48 hover:text-amber-100',
    tableHoverClass: 'hover:border-[#f6c863]',
    gameHeaderClass: 'bg-[#130707] border-red-950/60',
    tableSurfaceClass: 'from-red-950 via-emerald-950 to-yellow-950',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
};

export function getBaccaratSkin(skin?: string | null, gameId?: string | null): BaccaratSkin {
  if (skin && skin in BACCARAT_SKINS) {
    return BACCARAT_SKINS[skin as BaccaratSkinId];
  }
  const byGameId = Object.values(BACCARAT_SKINS).find((item) => item.gameId === gameId);
  return byGameId ?? BACCARAT_SKINS.royal;
}

