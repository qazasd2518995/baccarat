import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { leaderboardApi, tablesApi } from '../services/api';
import { useLobbySocket } from '../hooks/useLobbySocket';
import {
  Settings,
  User,
  Users,
  Spade,
  LayoutGrid,
  Heart,
  FileText,
  HelpCircle,
  Globe,
  ArrowUpDown,
  LogOut,
  Menu,
  X,
  Music,
  Music2,
  SkipForward,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import {
  GameSettingsModal,
  GameRulesModal,
  GameReportModal,
  FollowingListModal,
} from '../components/game/modals';
import LobbyRoadmap from '../components/lobby/LobbyRoadmap';
import type { RoadHistoryEntry } from '../utils/roadmap';

interface Table {
  id: string;
  name: string;
  dealer: string;
  dealerAvatar: string;
  minBet: number;
  maxBet: number;
  players: number;
  lastResults: ('player' | 'banker' | 'tie')[];
  status: 'betting' | 'dealing' | 'waiting';
  countdown?: number;
  roadmap: { banker: number; player: number; tie: number };
  gameType: 'baccarat' | 'dragonTiger' | 'bullBull';
  shoeNumber: number;
  roundNumber: number;
  hasGoodRoad?: boolean;
  roadHistory: RoadHistoryEntry[];
}

const GAME_TYPE_LABELS: Record<string, string> = {
  baccarat: '百家樂',
  dragonTiger: '龍虎',
  bullBull: '牛牛',
};

export default function Lobby() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'normal' | 'good_road'>('normal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Background music
  const [isBgmOn, setIsBgmOn] = useState(true);
  const { toggleBgm, skipTrack } = useBackgroundMusic(false);

  // Leaderboard state
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'daily' | 'weekly'>('daily');
  const [leaderboard, setLeaderboard] = useState<Array<{ rank: number; id: string; name: string; score: number }>>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const res = await leaderboardApi.getLeaderboard({ period: leaderboardPeriod, limit: 10 });
        setLeaderboard(res.data.leaderboard);
      } catch (err) {
        console.error('[Lobby] Failed to fetch leaderboard:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [leaderboardPeriod]);

  // Tables state
  const [tables, setTables] = useState<Table[]>([]);
  const [_tablesLoading, setTablesLoading] = useState(true);

  // Batch socket updates to avoid 30+ setTables calls per second
  type TableUpdatePayload = {
    tableId: string;
    phase: 'betting' | 'sealed' | 'dealing' | 'result';
    timeRemaining: number;
    roundNumber: number;
    shoeNumber: number;
    lastResult?: 'player' | 'banker' | 'tie';
    lastRoundEntry?: {
      roundNumber: number;
      result: string;
      playerPair: boolean;
      bankerPair: boolean;
    };
    roadmap: { banker: number; player: number; tie: number };
    newShoe?: boolean;
    playerCount?: number;
  };
  const pendingUpdatesRef = useRef<Map<string, TableUpdatePayload>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushUpdates = useCallback(() => {
    flushTimerRef.current = null;
    const updates = pendingUpdatesRef.current;
    if (updates.size === 0) return;
    const batch = new Map(updates);
    updates.clear();

    setTables(prevTables =>
      prevTables.map(table => {
        const update = batch.get(table.id);
        if (!update) return table;

        // Map phase to status
        let status: 'betting' | 'dealing' | 'waiting' = 'waiting';
        if (update.phase === 'betting') status = 'betting';
        else if (update.phase === 'dealing') status = 'dealing';
        else if (update.phase === 'sealed' || update.phase === 'result') status = 'waiting';

        // Update lastResults if we got a new result
        let lastResults = table.lastResults;
        if (update.lastResult && update.phase === 'result') {
          lastResults = [update.lastResult, ...table.lastResults].slice(0, 20);
        }

        // Reset roadHistory on new shoe or shoe number change
        let roadHistory = table.roadHistory;
        if (update.newShoe || update.shoeNumber !== table.shoeNumber) {
          roadHistory = [];
        }

        // Append to roadHistory if we got a new round entry (with deduplication)
        // Note: lastRoundEntry may be preserved from a result-phase even if current phase is betting
        if (update.lastRoundEntry) {
          const alreadyExists = roadHistory.some(
            r => r.roundNumber === update.lastRoundEntry!.roundNumber
          );
          if (!alreadyExists) {
            roadHistory = [...roadHistory, {
              roundNumber: update.lastRoundEntry.roundNumber,
              result: update.lastRoundEntry.result as 'player' | 'banker' | 'tie',
              playerPair: update.lastRoundEntry.playerPair,
              bankerPair: update.lastRoundEntry.bankerPair,
            }];
          }
        }

        return {
          ...table,
          status,
          countdown: update.timeRemaining,
          roundNumber: update.roundNumber,
          shoeNumber: update.shoeNumber,
          roadmap: update.roadmap,
          lastResults,
          roadHistory,
          players: update.playerCount ?? table.players,
        };
      })
    );
  }, []);

  // Real-time table update handler — accumulates into batch, flushes every 1s
  const handleTableUpdate = useCallback((update: TableUpdatePayload) => {
    // Preserve lastRoundEntry/lastResult/newShoe from a prior event
    // that would otherwise be overwritten by a subsequent event
    const existing = pendingUpdatesRef.current.get(update.tableId);
    if (existing?.lastRoundEntry && !update.lastRoundEntry) {
      update = { ...update, lastRoundEntry: existing.lastRoundEntry };
    }
    if (existing?.lastResult && !update.lastResult) {
      update = { ...update, lastResult: existing.lastResult };
    }
    if (existing?.newShoe && !update.newShoe) {
      update = { ...update, newShoe: existing.newShoe };
    }
    if (existing?.playerCount && !update.playerCount) {
      update = { ...update, playerCount: existing.playerCount };
    }
    pendingUpdatesRef.current.set(update.tableId, update);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushUpdates, 1000);
    }
  }, [flushUpdates]);

  // Clean up flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  // Connect to lobby socket for real-time updates
  useLobbySocket(handleTableUpdate);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      setTablesLoading(true);
      try {
        const res = await tablesApi.getTables();
        // Map API response to Table interface
        const mappedTables: Table[] = res.data.tables.map((t: {
          id: string;
          name: string;
          dealer: string;
          dealerAvatar?: string;
          gameType: string;
          minBet: number;
          maxBet: number;
          players: number;
          isActive: boolean;
          shoeNumber: number;
          roundNumber: number;
          roadmap: { banker: number; player: number; tie: number };
          lastResults?: string[];
          roadHistory?: Array<{ roundNumber: number; result: string; playerPair: boolean; bankerPair: boolean }>;
          status?: string;
          countdown?: number;
          hasGoodRoad?: boolean;
        }) => ({
          id: t.id,
          name: t.name,
          dealer: t.dealer,
          dealerAvatar: t.dealerAvatar || '',
          minBet: t.minBet,
          maxBet: t.maxBet,
          players: t.players,
          lastResults: (t.lastResults || []) as ('player' | 'banker' | 'tie')[],
          status: (t.status || 'betting') as 'betting' | 'dealing' | 'waiting',
          countdown: t.countdown || 30,
          roadmap: t.roadmap,
          gameType: t.gameType as 'baccarat' | 'dragonTiger' | 'bullBull',
          shoeNumber: t.shoeNumber,
          roundNumber: t.roundNumber,
          hasGoodRoad: t.hasGoodRoad || false,
          roadHistory: (t.roadHistory || []).map(r => ({
            roundNumber: r.roundNumber,
            result: r.result as 'player' | 'banker' | 'tie',
            playerPair: r.playerPair ?? false,
            bankerPair: r.bankerPair ?? false,
          })),
        }));
        // Merge with existing state: keep existing roadHistory if API returns empty
        setTables(prevTables => {
          if (prevTables.length === 0) return mappedTables;
          const prevMap = new Map(prevTables.map(t => [t.id, t]));
          return mappedTables.map(t => {
            const prev = prevMap.get(t.id);
            if (prev && t.roadHistory.length === 0 && prev.roadHistory.length > 0) {
              return { ...t, roadHistory: prev.roadHistory };
            }
            return t;
          });
        });
      } catch (err) {
        console.error('[Lobby] Failed to fetch tables:', err);
      } finally {
        setTablesLoading(false);
      }
    };

    fetchTables();
    // Refresh every 5 minutes as fallback (real-time updates via socket)
    const interval = setInterval(fetchTables, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinTable = (tableId: string, gameType?: string) => {
    // Route to the correct game based on game type
    switch (gameType) {
      case 'dragonTiger':
        navigate(`/game/dragontiger?table=${tableId}`);
        break;
      case 'bullBull':
        navigate(`/game/bullbull?table=${tableId}`);
        break;
      case 'baccarat':
      default:
        navigate(`/game?table=${tableId}`);
        break;
    }
  };

  // Filter tables based on selected category and view mode
  const filteredTables = useMemo(() => tables.filter((table) => {
    // Hide Bull Bull tables
    if (table.gameType === 'bullBull') return false;

    // Filter by game type
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'baccarat' && table.gameType !== 'baccarat') return false;
      if (selectedCategory === 'dt' && table.gameType !== 'dragonTiger') return false;
    }

    // Filter by good road mode
    if (viewMode === 'good_road' && !table.hasGoodRoad) return false;

    return true;
  }), [tables, selectedCategory, viewMode]);

  return (
    <div className="h-screen bg-[#1a1f2e] text-white flex flex-col overflow-hidden">
      {/* Main Content — no top header */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile menu toggle — floating button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-3 right-3 z-[60] p-2 bg-[#141922] border border-gray-700 rounded-lg text-gray-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Left Sidebar - Hidden on mobile, slide-in menu */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-64 bg-[#141922] border-r border-gray-800/50 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:flex
        `}>
          {/* OFA LIVE Header */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-orange-500 font-bold tracking-wider">
                <span className="text-xl">OFA</span>
                <span className="text-sm text-gray-400">{t('live')}</span>
              </div>
            </div>

            {/* User Card */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
                me
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-sm text-gray-300">{user?.username || 'meta111698'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">$</span>
                  <span className="text-xs text-gray-400">USD</span>
                  <span className="text-yellow-400 font-bold">{Number(user?.balance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bet Range */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ArrowUpDown className="w-3 h-3" />
              <span>1-20K</span>
            </div>
          </div>

          {/* Billboard Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="bg-gradient-to-b from-orange-500/20 to-transparent rounded-t-lg p-2 mb-2">
              <span className="text-orange-400 font-bold text-sm">{t('billboard')}</span>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLeaderboardPeriod('daily')}
                className={`text-xs px-3 py-1 rounded ${leaderboardPeriod === 'daily' ? 'bg-[#1e2a3a] text-white' : 'bg-gray-700/50 text-gray-500'}`}
              >
                {t('daily')}
              </button>
              <button
                onClick={() => setLeaderboardPeriod('weekly')}
                className={`text-xs px-3 py-1 rounded ${leaderboardPeriod === 'weekly' ? 'bg-[#1e2a3a] text-white' : 'bg-gray-700/50 text-gray-500'}`}
              >
                {t('weekly')}
              </button>
            </div>

            {/* Top 3 Leaderboard */}
            {leaderboardLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">{t('loading')}...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">{t('noData')}</div>
            ) : (
              <>
                <div className="flex justify-center gap-4 mb-4">
                  {(() => {
                    // Re-order to show rank 2, 1, 3 for podium display
                    const top3 = leaderboard.slice(0, 3);
                    const orderedTop3 = [
                      top3[1], // 2nd place
                      top3[0], // 1st place (center)
                      top3[2], // 3rd place
                    ].filter(Boolean);
                    return orderedTop3.map((player) => (
                      <div key={player.id} className="flex flex-col items-center">
                        <div className={`${player.rank === 1 ? 'w-16 h-16' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mb-1 border-2 ${player.rank === 1 ? 'border-yellow-400' : 'border-transparent'}`}>
                          <User className={player.rank === 1 ? 'w-8 h-8 text-white' : 'w-5 h-5 text-white'} />
                        </div>
                        <span className="text-xs text-white">{player.name}</span>
                        <span className="text-xs text-yellow-400">{player.score.toLocaleString()}</span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Rankings list */}
                <div className="space-y-1">
                  {leaderboard.slice(3).map((player) => (
                    <div key={player.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-800/30 rounded">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">{player.rank}</span>
                        <span className="text-sm text-gray-400">{player.name}</span>
                      </div>
                      <span className="text-sm text-yellow-400">{player.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-4 border-t border-gray-800/50 space-y-1">
            <button
              onClick={() => {
                const newState = toggleBgm();
                setIsBgmOn(newState);
              }}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              {isBgmOn ? <Music className="w-4 h-4 text-orange-400" /> : <Music2 className="w-4 h-4" />}
              {isBgmOn ? '關閉音樂' : '開啟音樂'}
            </button>
            <button
              onClick={skipTrack}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <SkipForward className="w-4 h-4" /> 下一首
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <FileText className="w-4 h-4" /> {t('gameReport')}
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <Settings className="w-4 h-4" /> {t('gameSettings')}
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> {t('gameRules')}
            </button>
          </div>

          {/* Language + Logout — bottom of sidebar */}
          <div className="p-4 border-t border-gray-800/50 flex items-center gap-3">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
              className="flex-1 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 py-2 bg-gray-800/50 rounded-lg transition-colors"
            >
              <Globe className="w-3.5 h-3.5" /> {i18n.language === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex-1 text-xs text-gray-400 hover:text-red-400 flex items-center justify-center gap-1.5 py-2 bg-gray-800/50 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> {t('logout')}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Sub Navigation */}
          <div className="h-auto sm:h-10 bg-[#0d1117] flex flex-wrap sm:flex-nowrap items-center px-2 sm:px-4 gap-2 sm:gap-4 py-2 sm:py-0 border-b border-gray-800/50">
            <button
              onClick={() => {
                const newState = toggleBgm();
                setIsBgmOn(newState);
              }}
              className="hidden sm:block text-gray-500 hover:text-white"
              title={isBgmOn ? '關閉音樂' : '開啟音樂'}
            >
              {isBgmOn ? <Music className="w-5 h-5 text-orange-400" /> : <Music2 className="w-5 h-5" />}
            </button>
            <button
              onClick={skipTrack}
              className="hidden sm:block text-gray-500 hover:text-white"
              title="下一首"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Game Type Tabs - Scrollable on mobile */}
            <div className="flex items-center gap-1 bg-[#1e2a3a] rounded-lg p-1 overflow-x-auto scrollbar-hide w-full sm:w-auto">
              {[
                { id: 'all', labelKey: 'allGames', icon: LayoutGrid },
                { id: 'baccarat', labelKey: 'baccarat', icon: Spade },
                { id: 'dt', labelKey: 'dragonTiger', icon: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition whitespace-nowrap ${
                    selectedCategory === tab.id
                      ? 'bg-[#2a3548] text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            <div className="hidden sm:block flex-1" />

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-[#1e2a3a] rounded-lg p-1">
              <button
                onClick={() => setViewMode('normal')}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition ${
                  viewMode === 'normal' ? 'bg-gray-600 text-white' : 'text-gray-500'
                }`}
              >
                {t('normal')}
              </button>
              <button
                onClick={() => setViewMode('good_road')}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition ${
                  viewMode === 'good_road' ? 'bg-gray-600 text-white' : 'text-gray-500'
                }`}
              >
                {t('goodRoad')}
              </button>
            </div>

          </div>

          {/* Tables Grid */}
          <div className="flex-1 p-2 sm:p-4 overflow-auto bg-[#0d1117]">
            {filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <LayoutGrid className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
                <p className="text-sm sm:text-base">{t('noTablesAvailable')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                {filteredTables.map((table, index) => {
                  const gameLabel = GAME_TYPE_LABELS[table.gameType] || table.gameType;
                  // Extract table number from name (e.g., "百家樂 1" -> "1")
                  const tableNumber = table.name.replace(/[^\dA-Za-z]/g, '').trim() || (index + 1).toString();
                  return (
                    <motion.div
                      key={table.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleJoinTable(table.id, table.gameType)}
                      className="bg-[#161b26] rounded-lg overflow-hidden border border-[#2a3040] hover:border-[#d4af37] cursor-pointer group transition-all duration-200 hover:shadow-[0_0_16px_rgba(212,175,55,0.25)]"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    >
                      {/* Header Bar — dark gradient */}
                      <div className="h-7 bg-gradient-to-r from-[#1a2332] to-[#0d1825] flex items-center px-2 gap-2">
                        <span className="text-white text-xs font-bold">{gameLabel}</span>
                        <span className="text-amber-400 text-xs font-bold">{tableNumber}</span>
                        <div className="flex items-center gap-1 ml-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-white text-xs">{table.players.toLocaleString()}</span>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ml-0.5 ${
                          table.roadHistory.length > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`} style={{ fontSize: '10px', lineHeight: 1 }}>
                          {table.roadHistory.length}
                        </span>

                        {/* Good Road indicator */}
                        {table.hasGoodRoad && (
                          <span className="text-yellow-400 text-xs" title={t('goodRoad')}>⚡</span>
                        )}

                        <div className="flex-1" />

                        {/* Banker/Player/Tie stats */}
                        <span className="text-red-400 text-xs font-bold">{t('roadBanker') || '莊'}{table.roadmap.banker}</span>
                        <span className="text-blue-400 text-xs font-bold ml-1">{t('roadPlayer') || '閒'}{table.roadmap.player}</span>
                        <span className="text-green-400 text-xs font-bold ml-1">{t('roadTie') || '和'}{table.roadmap.tie}</span>
                      </div>

                      {/* Body — full-width roadmap */}
                      <div className="relative" style={{ minHeight: 148 }}>
                        {/* Roadmap grids — full width */}
                        <div className="w-full overflow-hidden" style={{ height: 148 }}>
                          <LobbyRoadmap roadHistory={table.roadHistory} />
                        </div>

                        {/* Dealer name badge — bottom left */}
                        <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                          <span className="text-[9px] bg-blue-600 text-white px-1 rounded">中文</span>
                          <span className="text-[10px] text-white font-bold">{table.dealer}</span>
                        </div>

                        {/* Status badge — bottom right with glow */}
                        {table.status === 'betting' && table.countdown && table.countdown > 0 && (
                          <div
                            className="absolute bottom-1 right-1 px-2 py-0.5 text-white text-[10px] font-bold rounded"
                            style={{
                              backgroundColor: table.countdown <= 3 ? '#ef4444' : table.countdown <= 5 ? '#eab308' : '#22c55e',
                              boxShadow: `0 0 8px ${table.countdown <= 3 ? 'rgba(239,68,68,0.5)' : table.countdown <= 5 ? 'rgba(234,179,8,0.5)' : 'rgba(34,197,94,0.5)'}`,
                            }}
                          >
                            {table.countdown}s
                          </div>
                        )}

                        {/* Hover overlay — subtle with enter badge */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                          <span className="bg-[#d4af37] text-black px-3 py-1 rounded text-xs font-bold">{t('joinTable')}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Hidden on mobile and tablet */}
        <div className="hidden xl:flex w-56 bg-[#141922] border-l border-gray-800/50 flex-col shrink-0">
          {/* Menu Links */}
          <div className="p-4 space-y-1">
            <button
              onClick={() => setShowFollowingModal(true)}
              className="w-full text-left text-sm text-pink-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <Heart className="w-4 h-4" /> {t('followingList')}
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <FileText className="w-4 h-4" /> {t('gameReport')}
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <Settings className="w-4 h-4" /> {t('gameSettings')}
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> {t('gameRules')}
            </button>
          </div>

          {/* Promotion Banner */}
          <div className="mt-auto p-4">
            <div className="bg-gradient-to-r from-orange-600/80 to-red-600/80 rounded-lg p-3 relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-xs text-orange-200 mb-1">One Bet to Rule!</div>
                <div className="text-white font-bold text-sm">NiuNiu Duel,</div>
                <div className="text-white font-bold text-sm">Epic Bonuses!</div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GameSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <GameRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
      <GameReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
      <FollowingListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        onGoToTable={handleJoinTable}
      />

    </div>
  );
}
