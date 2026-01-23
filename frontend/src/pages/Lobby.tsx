import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { leaderboardApi, tablesApi, reportApi } from '../services/api';
import { useLobbySocket } from '../hooks/useLobbySocket';
import { useChatSocket } from '../hooks/useChatSocket';
import {
  Bell,
  Settings,
  User,
  Users,
  Spade,
  LayoutGrid,
  Gift,
  Heart,
  BarChart2,
  FileText,
  HelpCircle,
  Video,
  Maximize,
  ChevronRight,
  Globe,
  Pencil,
  RefreshCw,
  ArrowUpDown,
  Volume2,
  Smile,
  Send,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  GameSettingsModal,
  GameRulesModal,
  GameReportModal,
  FollowingListModal,
} from '../components/game/modals';

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
}


// Bead Road Cell
function BeadRoadCell({ result }: { result?: 'player' | 'banker' | 'tie' }) {
  if (!result) {
    return <div className="w-5 h-5 rounded-full bg-gray-700/30" />;
  }

  const styles = {
    banker: 'bg-red-600 text-white',
    player: 'bg-blue-600 text-white',
    tie: 'bg-green-600 text-white',
  };

  const labels = { banker: 'B', player: 'P', tie: 'T' };

  return (
    <div className={`w-5 h-5 rounded-full ${styles[result]} flex items-center justify-center text-[10px] font-bold`}>
      {labels[result]}
    </div>
  );
}

export default function Lobby() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'normal' | 'good_road'>('normal');
  const [showResultsProportion, setShowResultsProportion] = useState(false);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

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

  // Chat with useChatSocket hook
  const { messages: chatMessages, loading: chatLoading, sendMessage } = useChatSocket();
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // User's total bet amount today (for chat permission)
  const [userTotalBet, setUserTotalBet] = useState(0);
  const canChat = userTotalBet >= 100;

  // Fetch user's today bet amount
  useEffect(() => {
    const fetchTodayBets = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const res = await reportApi.getMemberReport({
          from: today.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0],
        });
        setUserTotalBet(res.data?.totalBet || 0);
      } catch (err) {
        console.error('[Lobby] Failed to fetch today bets:', err);
      }
    };

    fetchTodayBets();
    // Refresh every 60 seconds
    const interval = setInterval(fetchTodayBets, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle send chat
  const handleSendChat = () => {
    if (!chatInput.trim() || !canChat) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  // Format chat time
  const formatChatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // Tables state
  const [tables, setTables] = useState<Table[]>([]);
  const [_tablesLoading, setTablesLoading] = useState(true);

  // Real-time table update handler
  const handleTableUpdate = useCallback((update: {
    tableId: string;
    phase: 'betting' | 'sealed' | 'dealing' | 'result';
    timeRemaining: number;
    roundNumber: number;
    shoeNumber: number;
    lastResult?: 'player' | 'banker' | 'tie';
    roadmap: { banker: number; player: number; tie: number };
  }) => {
    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id !== update.tableId) return table;

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

        return {
          ...table,
          status,
          countdown: update.timeRemaining,
          roundNumber: update.roundNumber,
          shoeNumber: update.shoeNumber,
          roadmap: update.roadmap,
          lastResults,
        };
      })
    );
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
        }));
        setTables(mappedTables);
      } catch (err) {
        console.error('[Lobby] Failed to fetch tables:', err);
        // Show empty state when API fails
        setTables([]);
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
  const filteredTables = tables.filter((table) => {
    // Filter by game type
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'baccarat' && table.gameType !== 'baccarat') return false;
      if (selectedCategory === 'dt' && table.gameType !== 'dragonTiger') return false;
      if (selectedCategory === 'bullbull' && table.gameType !== 'bullBull') return false;
    }

    // Filter by good road mode
    if (viewMode === 'good_road' && !table.hasGoodRoad) return false;

    return true;
  });

  // Calculate percentage for results proportion display
  const getResultPercentages = (roadmap: { banker: number; player: number; tie: number }) => {
    const total = roadmap.banker + roadmap.player + roadmap.tie;
    if (total === 0) return { banker: 0, player: 0, tie: 0 };
    return {
      banker: Math.round((roadmap.banker / total) * 100),
      player: Math.round((roadmap.player / total) * 100),
      tie: Math.round((roadmap.tie / total) * 100),
    };
  };

  return (
    <div className="h-screen bg-[#1a1f2e] text-white flex flex-col overflow-hidden">
      {/* Top Navigation Bar - GoFun Style */}
      <header className="h-12 bg-[#0d1117] flex items-center justify-between px-4 border-b border-gray-800/50">
        {/* Left - Logo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">G</div>
            <span className="text-orange-500 font-bold text-xl tracking-wide">GoFun</span>
          </div>
        </div>

        {/* Center - Balance & Deposit */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold">T</div>
            <span className="text-green-400 font-bold">{Number(user?.balance || 10000).toLocaleString()}</span>
            <span className="text-gray-500">^</span>
          </div>
          <button className="bg-green-500 hover:bg-green-400 text-white px-4 py-1 rounded text-sm font-bold transition">
            {t('deposit')}
          </button>
        </div>

        {/* Right - User Info */}
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <Gift className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-300">{user?.username || 'LN8270722'}</span>
          </div>
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <Globe className="w-4 h-4" /> {i18n.language === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-[#141922] border-r border-gray-800/50 flex flex-col">
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
                  <Pencil className="w-3 h-3 text-gray-600 cursor-pointer hover:text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">$</span>
                  <span className="text-xs text-gray-400">USD</span>
                  <span className="text-yellow-400 font-bold">{Number(user?.balance || 0).toLocaleString()}</span>
                  <RefreshCw className="w-3 h-3 text-gray-600 cursor-pointer hover:text-gray-400" />
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

            {/* Tabs */}
            <div className="flex gap-1 mb-3">
              <button className="flex-1 text-xs py-1.5 bg-[#1e2a3a] text-white rounded">{t('playerTab')}</button>
              <button className="flex-1 text-xs py-1.5 bg-gray-700/50 text-gray-500 rounded border-b-2 border-orange-400">{t('dealerTab')}</button>
              <button className="flex-1 text-xs py-1.5 bg-gray-700/50 text-gray-500 rounded">{t('giftsTab')}</button>
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
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub Navigation */}
          <div className="h-10 bg-[#0d1117] flex items-center px-4 gap-4 border-b border-gray-800/50">
            <button className="text-gray-500 hover:text-white">
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Game Type Tabs */}
            <div className="flex items-center gap-1 bg-[#1e2a3a] rounded-lg p-1">
              {[
                { id: 'all', labelKey: 'allGames', icon: LayoutGrid },
                { id: 'baccarat', labelKey: 'baccarat', icon: Spade },
                { id: 'dt', labelKey: 'dragonTiger', icon: null },
                { id: 'bullbull', labelKey: 'bullBull', icon: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm transition ${
                    selectedCategory === tab.id
                      ? 'bg-[#2a3548] text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1 text-gray-500 hover:text-gray-300 text-sm">
              <Globe className="w-4 h-4" /> {t('asia')}
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1 text-gray-500 hover:text-gray-300 text-sm">
              <LayoutGrid className="w-4 h-4" /> {t('multiTables')}
            </button>

            <div className="flex-1" />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#1e2a3a] rounded-lg p-1">
              <button
                onClick={() => setViewMode('normal')}
                className={`px-3 py-1 rounded text-sm transition ${
                  viewMode === 'normal' ? 'bg-gray-600 text-white' : 'text-gray-500'
                }`}
              >
                {t('normal')}
              </button>
              <button
                onClick={() => setViewMode('good_road')}
                className={`px-3 py-1 rounded text-sm transition ${
                  viewMode === 'good_road' ? 'bg-gray-600 text-white' : 'text-gray-500'
                }`}
              >
                {t('goodRoad')}
              </button>
            </div>

            {/* Action buttons */}
            <button className="p-1 text-gray-500 hover:text-white">
              <Maximize className="w-4 h-4" />
            </button>
            <button className="p-1 text-gray-500 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tables Grid */}
          <div className="flex-1 p-4 overflow-auto bg-[#0d1117]">
            {filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
                <p>{t('noTablesAvailable')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredTables.map((table, index) => {
                  const percentages = getResultPercentages(table.roadmap);
                  return (
                    <motion.div
                      key={table.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleJoinTable(table.id, table.gameType)}
                      className="bg-[#1a1f2e] rounded-lg overflow-hidden border border-gray-800/50 hover:border-orange-500/50 cursor-pointer group transition-all"
                    >
                      {/* Table Preview */}
                      <div className="relative h-36 bg-gradient-to-b from-[#2d1f4e] to-[#1a1535] flex items-center justify-center overflow-hidden">
                        {/* Background effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20" />

                        {/* Good Road indicator */}
                        {table.hasGoodRoad && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-orange-500/80 text-white text-[10px] font-bold flex items-center gap-1">
                            <span>🔥</span> {t('goodRoad')}
                          </div>
                        )}

                        {/* Dealer avatar */}
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center border-2 border-pink-400/50 shadow-lg">
                          <User className="w-10 h-10 text-white" />
                        </div>

                        {/* Status badge */}
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                          table.status === 'betting' ? 'bg-green-500 text-white' :
                          table.status === 'dealing' ? 'bg-yellow-500 text-black' :
                          'bg-gray-500 text-white'
                        }`}>
                          {table.status === 'betting' ? `${t('betting')} ${table.countdown}s` :
                           table.status === 'dealing' ? t('dealing') : t('waiting')}
                        </div>

                        {/* Players count */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-gray-300 bg-black/40 px-2 py-0.5 rounded">
                          <Users className="w-3 h-3" />
                          <span>{table.players.toLocaleString()}</span>
                        </div>

                        {/* Shoe/Round info */}
                        <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded">
                          {t('shoe')} {table.shoeNumber} / {t('round')} {table.roundNumber}
                        </div>

                        {/* Roadmap stats or Percentage display */}
                        {showResultsProportion ? (
                          <div className="absolute top-8 right-2 text-[10px] text-right bg-black/60 rounded px-2 py-1">
                            <div className="text-red-400">{t('banker')} {percentages.banker}%</div>
                            <div className="text-blue-400">{t('player')} {percentages.player}%</div>
                            <div className="text-green-400">{t('tie')} {percentages.tie}%</div>
                          </div>
                        ) : (
                          <div className="absolute top-8 right-2 text-[10px] text-right">
                            <div className="text-red-400">B{table.roadmap.banker}</div>
                            <div className="text-blue-400">P{table.roadmap.player}</div>
                            <div className="text-green-400">T{table.roadmap.tie}</div>
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold text-sm">{t('joinTable')}</span>
                        </div>
                      </div>

                      {/* Table Info */}
                      <div className="p-2 bg-[#141922]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-sm">{table.name}</span>
                          <span className="text-[10px] text-gray-400">{t('dealer')}: <span className="text-gray-300">{table.dealer}</span></span>
                        </div>

                        {/* Roadmap preview */}
                        <div className="flex gap-0.5 mb-1">
                          {table.lastResults.slice(0, 8).map((result, i) => (
                            <BeadRoadCell key={i} result={result} />
                          ))}
                        </div>

                        {/* Bet limits */}
                        <div className="text-[10px] text-gray-500">
                          ${table.minBet.toLocaleString()} - ${table.maxBet.toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-56 bg-[#141922] border-l border-gray-800/50 flex flex-col">
          {/* Menu Links */}
          <div className="p-4 space-y-1">
            <button
              onClick={() => setShowFollowingModal(true)}
              className="w-full text-left text-sm text-pink-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors"
            >
              <Heart className="w-4 h-4" /> {t('followingList')}
            </button>
            <button
              onClick={() => setShowResultsProportion(!showResultsProportion)}
              className={`w-full text-left text-sm flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors ${showResultsProportion ? 'text-orange-400' : 'text-gray-400'}`}
            >
              <BarChart2 className="w-4 h-4" /> {t('resultsProportion')}
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
            <button className="w-full text-left text-sm text-gray-400 flex items-center gap-2 py-2 px-3 hover:bg-gray-800/30 rounded transition-colors">
              <Video className="w-4 h-4" /> {t('liveScene')}
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

          {/* Live Chat */}
          <div className="border-t border-gray-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-white">{t('liveChat')}</div>
              {!canChat && (
                <div className="text-[10px] text-gray-500">
                  {t('betOver100')} ({userTotalBet}/100)
                </div>
              )}
            </div>
            <div ref={chatContainerRef} className="space-y-2 text-xs max-h-32 overflow-y-auto">
              {chatLoading ? (
                <div className="text-center text-gray-500">{t('loading')}...</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center text-gray-500">{t('noData')}</div>
              ) : (
                chatMessages.slice(-10).map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <span className="text-pink-400 shrink-0">{msg.username}</span>
                    <span className="text-gray-300 truncate flex-1">{msg.message}</span>
                    <span className="text-gray-500 shrink-0">{formatChatTime(msg.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={canChat ? t('typeMessage') : t('betOver100')}
                className={`flex-1 bg-[#1e2a3a] text-white text-xs px-3 py-2 rounded outline-none ${
                  !canChat ? 'opacity-50 cursor-not-allowed' : 'focus:ring-1 focus:ring-yellow-500/50'
                }`}
                disabled={!canChat}
              />
              <button className="text-gray-500 hover:text-gray-300"><Gift className="w-4 h-4" /></button>
              <button className="text-gray-500 hover:text-gray-300"><Smile className="w-4 h-4" /></button>
              <button
                onClick={handleSendChat}
                disabled={!canChat || !chatInput.trim()}
                className={`${canChat && chatInput.trim() ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 cursor-not-allowed'}`}
              >
                <Send className="w-4 h-4" />
              </button>
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
