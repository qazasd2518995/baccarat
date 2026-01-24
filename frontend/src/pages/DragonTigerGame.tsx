import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { leaderboardApi, dealerApi } from '../services/api';
import { useChatSocket } from '../hooks/useChatSocket';
import {
  Settings,
  User,
  ChevronLeft,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  HelpCircle,
  Video,
  Heart,
  HeartOff,
  BarChart2,
  FileText,
  Info,
  X,
  RotateCcw,
  Check,
  Wifi,
  WifiOff,
  ArrowUpDown,
  Gift,
  Smile,
  Send,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { useDragonTigerStore, type DragonTigerBetType, CHIP_VALUES } from '../store/dragonTigerStore';
import { useDragonTigerSocket } from '../hooks/useDragonTigerSocket';
import { useAuthStore } from '../store/authStore';
import PlayingCard from '../components/game/PlayingCard';
import {
  GameSettingsModal,
  GameRulesModal,
  GameReportModal,
  FollowingListModal,
  TableSwitchModal,
  GiftModal,
  ResultsProportionModal,
} from '../components/game/modals';

// Chip component - Casino style with edge notches
function Chip({ value, selected, onClick, disabled }: { value: number; selected: boolean; onClick: () => void; disabled?: boolean }) {
  const chipColors: Record<number, string> = {
    5: 'from-gray-300 to-gray-500',
    10: 'from-slate-400 to-slate-600',
    25: 'from-emerald-400 to-emerald-600',
    50: 'from-green-500 to-green-700',
    100: 'from-red-500 to-red-700',
    500: 'from-purple-500 to-purple-700',
  };

  const color = chipColors[value] || 'from-gray-500 to-gray-700';

  const formatValue = (v: number) => {
    if (v >= 1000) {
      const k = v / 1000;
      return k >= 1000 ? `${k / 1000}M` : `${k}K`;
    }
    return v.toString();
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-14 h-14 rounded-full flex items-center justify-center font-bold
        bg-gradient-to-br ${color}
        border-4 border-white/30
        shadow-lg transition-all duration-200
        ${selected ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900' : ''}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
      `}
    >
      <div className="absolute inset-2 rounded-full border-2 border-white/20" />
      <span className="relative z-10 text-white font-black drop-shadow-lg text-[10px]">
        {formatValue(value)}
      </span>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
        }}
      />
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-2 bg-white/30 rounded-sm"
          style={{
            transform: `rotate(${i * 45}deg) translateY(-24px)`,
          }}
        />
      ))}
    </button>
  );
}

// Dragon Tiger Ask Road Cell - Shows 龍/虎/和 in circles
function DTAskRoadCell({ result, labels }: { result?: 'dragon' | 'tiger' | 'tie'; labels: { dragon: string; tiger: string; tie: string } }) {
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        {/* Empty cell */}
      </div>
    );
  }

  const styles: Record<string, { border: string; text: string; bg: string }> = {
    dragon: { border: '#DC2626', text: '#FFFFFF', bg: '#DC2626' },  // Red filled
    tiger: { border: '#2563EB', text: '#FFFFFF', bg: '#2563EB' },   // Blue filled
    tie: { border: '#16A34A', text: '#FFFFFF', bg: '#16A34A' },     // Green filled
  };

  const style = styles[result];

  // Guard against invalid result values
  if (!style) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        {/* Unknown result */}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
        style={{
          border: `2px solid ${style.border}`,
          color: style.text,
          backgroundColor: style.bg,
          fontSize: '11px'
        }}
      >
        {labels[result] || '?'}
      </div>
    </div>
  );
}

// Dragon Tiger Big Road Cell
function DTBigRoadCell({ result, tieCount = 0 }: { result?: 'dragon' | 'tiger'; tieCount?: number }) {
  if (!result) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors: Record<string, { border: string }> = {
    dragon: { border: '#DC2626' },  // Red for Dragon
    tiger: { border: '#2563EB' },   // Blue for Tiger
  };
  const color = colors[result];

  // Guard against invalid result values
  if (!color) {
    return <div className="w-full h-full bg-white" />;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white">
      <div
        className="w-5 h-5 rounded-full"
        style={{ border: `2px solid ${color.border}` }}
      />
      {tieCount > 0 && (
        tieCount === 1 ? (
          <div
            className="absolute top-1/2 left-1/4 right-1/4 h-0.5 -translate-y-1/2"
            style={{ backgroundColor: '#16A34A' }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-[8px] font-bold"
            style={{ color: '#16A34A' }}
          >
            {tieCount}
          </div>
        )
      )}
    </div>
  );
}

// Derived Road Cell for Dragon Tiger
function DTDerivedRoadCell({ value, type }: { value?: 'red' | 'blue'; type: 'big_eye' | 'small' | 'cockroach' }) {
  if (!value) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors = {
    red: { border: '#DC2626', fill: '#DC2626' },
    blue: { border: '#2563EB', fill: '#2563EB' },
  };
  const color = colors[value];

  if (type === 'big_eye') {
    return (
      <div className="w-full h-full flex items-center justify-center p-px bg-white">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ border: `1.5px solid ${color.border}` }}
        />
      </div>
    );
  }

  if (type === 'small') {
    return (
      <div className="w-full h-full flex items-center justify-center p-px bg-white">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color.fill }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <svg viewBox="0 0 10 10" className="w-3 h-3">
        <line x1="2" y1="8" x2="8" y2="2" stroke={color.fill} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Build Big Road data structure for Dragon Tiger
function buildDTBigRoad(data: Array<{ result: 'dragon' | 'tiger' | 'tie' }>) {
  const ROWS = 6;
  const COLS = 20;
  const grid: ({ result: 'dragon' | 'tiger'; tieCount: number } | null)[][] =
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

  if (data.length === 0) return grid;

  let col = 0;
  let row = 0;
  let lastResult: 'dragon' | 'tiger' | null = null;
  let tieCount = 0;

  for (const round of data) {
    if (round.result === 'tie') {
      tieCount++;
      continue;
    }

    if (lastResult === null || round.result !== lastResult) {
      if (lastResult !== null) {
        col++;
        row = 0;
      }
      lastResult = round.result;
    } else {
      row++;
      if (row >= ROWS) {
        row = ROWS - 1;
        col++;
      }
    }

    if (col < COLS && row < ROWS) {
      grid[row][col] = {
        result: round.result,
        tieCount,
      };
      tieCount = 0;
    }
  }

  return grid;
}

// Phase display text
function getPhaseDisplay(phase: string, timeRemaining: number, t: (key: string) => string): { text: string; color: string } {
  switch (phase) {
    case 'betting':
      return { text: `${t('pleaseBet')} ${timeRemaining}`, color: 'text-green-400' };
    case 'sealed':
      return { text: t('stopBetting'), color: 'text-yellow-400' };
    case 'dealing':
      return { text: t('dealingCards'), color: 'text-orange-400' };
    case 'result':
      return { text: t('showResult'), color: 'text-white' };
    default:
      return { text: '', color: 'text-white' };
  }
}

export default function DragonTigerGame() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { submitBets, cancelBets } = useDragonTigerSocket();

  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [isTableSwitchOpen, setIsTableSwitchOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isProportionOpen, setIsProportionOpen] = useState(false);

  // UI states
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFollowingDealer, setIsFollowingDealer] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Current dealer name
  const currentDealerName = '小美';

  // Check initial follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const res = await dealerApi.isFollowing(currentDealerName);
        setIsFollowingDealer(res.data.isFollowing);
      } catch (err) {
        console.error('[DragonTiger] Failed to check follow status:', err);
      }
    };
    checkFollowStatus();
  }, [currentDealerName]);

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
        console.error('[DragonTiger] Failed to fetch leaderboard:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [leaderboardPeriod]);

  // Chat state
  const { messages: chatMessages, sendMessage: sendChatMessage, loading: chatLoading } = useChatSocket();
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const formatChatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFollowDealer = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowingDealer) {
        await dealerApi.unfollowDealer(currentDealerName);
        setIsFollowingDealer(false);
      } else {
        await dealerApi.followDealer(currentDealerName);
        setIsFollowingDealer(true);
      }
    } catch (err) {
      console.error('[DragonTiger] Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const {
    isConnected,
    phase,
    timeRemaining,
    roundNumber,
    balance,
    pendingBets,
    confirmedBets,
    selectedChip,
    setSelectedChip,
    addPendingBet,
    clearPendingBets,
    loadRepeatBets,
    getBetAmount,
    dragonCard,
    tigerCard,
    dragonValue,
    tigerValue,
    lastResult,
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
  } = useDragonTigerStore();

  // Bet success notification
  const [betNotification, setBetNotification] = useState<{
    show: boolean;
    bets: Array<{ type: string; amount: number }>;
    total: number;
  }>({ show: false, bets: [], total: 0 });

  const prevConfirmedBetsRef = useRef<number>(0);

  useEffect(() => {
    const currentCount = confirmedBets.length;
    const prevCount = prevConfirmedBetsRef.current;

    if (currentCount > 0 && currentCount > prevCount && phase === 'betting') {
      const total = confirmedBets.reduce((sum, b) => sum + b.amount, 0);
      setBetNotification({
        show: true,
        bets: confirmedBets.map(b => ({ type: b.type, amount: b.amount })),
        total,
      });

      const timer = setTimeout(() => {
        setBetNotification(prev => ({ ...prev, show: false }));
      }, 3000);

      return () => clearTimeout(timer);
    }

    prevConfirmedBetsRef.current = currentCount;
  }, [confirmedBets, phase]);

  useEffect(() => {
    prevConfirmedBetsRef.current = 0;
  }, [roundNumber]);

  const canBet = phase === 'betting' && isConnected;
  const hasPendingBets = pendingBets.length > 0;
  const hasConfirmedBets = confirmedBets.length > 0;

  const handleBet = (type: DragonTigerBetType) => {
    if (!canBet) return;
    addPendingBet(type);
  };

  const handleConfirm = () => {
    if (!canBet || !hasPendingBets) return;
    submitBets();
  };

  const handleCancel = () => {
    if (!canBet) return;
    if (hasPendingBets) {
      clearPendingBets();
    } else if (hasConfirmedBets) {
      cancelBets();
    }
  };

  const handleRepeat = () => {
    if (!canBet) return;
    loadRepeatBets();
  };

  // Stats from roadmap
  const dragonWins = roadmapData.filter(r => r.result === 'dragon').length;
  const tigerWins = roadmapData.filter(r => r.result === 'tiger').length;
  const ties = roadmapData.filter(r => r.result === 'tie').length;
  const total = roadmapData.length;

  // Build big road grid
  const bigRoadGrid = buildDTBigRoad(roadmapData);

  // Phase display
  const phaseDisplay = getPhaseDisplay(phase, timeRemaining, t);

  // Net result from last settlement
  const netResult = lastSettlement?.netResult || 0;
  const showResult = phase === 'result' && lastResult !== null;

  // Bet type labels
  const betTypeLabels: Record<string, string> = {
    dragon: t('dtDragon'),
    tiger: t('dtTiger'),
    dt_tie: t('dtTie'),
    dragon_odd: t('dragonOdd'),
    dragon_even: t('dragonEven'),
    tiger_odd: t('tigerOdd'),
    tiger_even: t('tigerEven'),
    dragon_red: t('dragonRed'),
    dragon_black: t('dragonBlack'),
    tiger_red: t('tigerRed'),
    tiger_black: t('tigerBlack'),
  };

  // Calculate total bet
  const totalBet = pendingBets.reduce((sum, b) => sum + b.amount, 0) +
                   confirmedBets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="h-screen bg-[#1a1f2e] text-white flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-11 bg-[#0d1117] flex items-center justify-between px-4 border-b border-gray-800/50">
        {/* Left - Back & Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="p-1 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="p-1 text-gray-400 hover:text-white">
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? t('live') : t('offline')}
          </div>
        </div>

        <div />

        {/* Right - Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-1 text-gray-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 text-gray-400 hover:text-white"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/lobby')}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - User Info & Leaderboard */}
        <div className="w-60 bg-[#141922] border-r border-gray-800/50 flex flex-col">
          {/* OFA LIVE Header */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-orange-500 font-bold tracking-wider">
                <span className="text-lg">OFA</span>
                <span className="text-sm text-gray-400">{t('live')}</span>
              </div>
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700/50"
              >
                {i18n.language === 'zh' ? 'EN' : '中文'}
              </button>
            </div>

            {/* User Card */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                me
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-sm text-gray-300">{user?.username || 'Player'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">$</span>
                  <span className="text-sm text-gray-300">USD</span>
                  <span className="text-yellow-400 font-bold">{balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bet Range */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ArrowUpDown className="w-3 h-3" />
              <span>5-10K</span>
            </div>
          </div>

          {/* Billboard Section */}
          <div className="flex-1 p-4">
            <div className="bg-gradient-to-b from-orange-500/20 to-transparent rounded-t-lg p-2 mb-2">
              <span className="text-orange-400 font-bold text-sm">{t('billboard')}</span>
            </div>

            <div className="flex gap-1 mb-3">
              <button className="flex-1 text-xs py-1.5 bg-[#1e2a3a] text-white rounded">{t('playerTab')}</button>
              <button className="flex-1 text-xs py-1.5 bg-gray-700/50 text-gray-500 rounded border-b-2 border-orange-400">{t('dealerTab')}</button>
              <button className="flex-1 text-xs py-1.5 bg-gray-700/50 text-gray-500 rounded">{t('giftsTab')}</button>
            </div>

            <div className="flex gap-2 mb-3">
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

            {/* Leaderboard */}
            {leaderboardLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">{t('loading')}...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">{t('noData')}</div>
            ) : (
              <>
                <div className="space-y-2">
                  {leaderboard.slice(0, 3).map((player) => (
                    <div key={player.id} className="flex items-center gap-2 py-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white">{player.name}</div>
                        <div className="text-xs text-yellow-400">{player.score.toLocaleString()}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        player.rank === 1 ? 'bg-yellow-500 text-black' :
                        player.rank === 2 ? 'bg-gray-400 text-black' :
                        'bg-amber-700 text-white'
                      }`}>
                        {player.rank}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1 text-xs">
                  {leaderboard.slice(3).map((player) => (
                    <div key={player.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">{player.rank}</span>
                        <span className="text-gray-400">{player.name}</span>
                      </div>
                      <span className="text-yellow-400">{player.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center - Game Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Area - Card Display */}
          <div className="flex-1 relative bg-gradient-to-br from-[#2d1f4e] via-[#1a1535] to-[#0f1525] overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
            </div>

            {/* Round Info */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 rounded px-3 py-1 text-sm z-20">
              <span className="text-gray-400">{t('dragonTiger')} {shoeNumber}</span>
              <span className="text-white ml-2">{new Date().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`ml-2 font-bold ${phaseDisplay.color}`}>{roundNumber} - {phaseDisplay.text}</span>
            </div>

            {/* Cards Display - Dragon vs Tiger */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-20">
                {/* Dragon Side */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-4">{t('dtDragon')}</div>
                  <div className="relative">
                    {dragonCard ? (
                      <motion.div
                        initial={{ rotateY: 180, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <PlayingCard card={dragonCard} size="lg" />
                      </motion.div>
                    ) : (
                      <div className="w-24 h-32 bg-gradient-to-br from-red-900 to-red-950 rounded-lg border-2 border-red-700 flex items-center justify-center">
                        <span className="text-red-400 text-4xl">{t('dtDragon')}</span>
                      </div>
                    )}
                    {dragonValue !== null && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full font-bold text-lg">
                        {dragonValue}
                      </div>
                    )}
                  </div>
                </div>

                {/* VS */}
                <div className="text-4xl font-bold text-gray-500">VS</div>

                {/* Tiger Side */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-4">{t('dtTiger')}</div>
                  <div className="relative">
                    {tigerCard ? (
                      <motion.div
                        initial={{ rotateY: 180, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <PlayingCard card={tigerCard} size="lg" />
                      </motion.div>
                    ) : (
                      <div className="w-24 h-32 bg-gradient-to-br from-blue-900 to-blue-950 rounded-lg border-2 border-blue-700 flex items-center justify-center">
                        <span className="text-blue-400 text-4xl">{t('dtTiger')}</span>
                      </div>
                    )}
                    {tigerValue !== null && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full font-bold text-lg">
                        {tigerValue}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center z-30 bg-black/50"
                >
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-4 ${
                      lastResult === 'dragon' ? 'text-red-400' :
                      lastResult === 'tiger' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {lastResult === 'dragon' ? t('dragonWins') :
                       lastResult === 'tiger' ? t('tigerWins') : t('dtTieResult')}
                    </div>
                    {lastSettlement && netResult !== 0 && (
                      <div className={`text-2xl font-bold ${netResult > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {netResult > 0 ? '+' : ''}{netResult.toLocaleString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Betting Panel */}
          <div className="bg-[#0d1117]">
            {/* Control Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{t('dragonTiger')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={!canBet || (!hasPendingBets && !hasConfirmedBets)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded disabled:opacity-50"
                >
                  <X className="w-3 h-3" /> {t('cancel')}
                </button>
                <button
                  onClick={handleRepeat}
                  disabled={!canBet || lastBets.length === 0}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" /> {t('repeat')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canBet || !hasPendingBets}
                  className="flex items-center gap-1 px-4 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold disabled:opacity-50"
                >
                  <Check className="w-3 h-3" /> {t('confirm')}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs text-gray-400 hover:text-white">{t('signal')}</button>
                <button className="text-xs text-orange-400 hover:text-orange-300">{t('gifts')}</button>
              </div>
            </div>

            {/* Betting Areas - Full Width */}
            <div className="flex items-stretch h-[360px]" style={{ backgroundColor: '#FFFFFF' }}>
              {/* Left: Ask Roads (龍問路 / 虎問路) */}
              <div className="w-[22%] flex flex-col">
                {/* 龍問路 */}
                <div className="flex flex-1 border-b border-gray-400">
                  <div
                    className="w-7 flex flex-col items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    <span className="writing-vertical tracking-wider">{t('dragonAskRoad')}</span>
                    <div className="flex gap-0.5 mt-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FCA5A5' }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FCA5A5' }} />
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-8 grid-rows-4 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {Array(32).fill(null).map((_, i) => {
                      const round = roadmapData[i];
                      return <DTAskRoadCell key={`ask-d-${i}`} result={round?.result} labels={{ dragon: t('dtRoadDragon'), tiger: t('dtRoadTiger'), tie: t('dtRoadTie') }} />;
                    })}
                  </div>
                </div>

                {/* 虎問路 */}
                <div className="flex flex-1 border-b border-gray-400">
                  <div
                    className="w-7 flex flex-col items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    <span className="writing-vertical tracking-wider">{t('tigerAskRoad')}</span>
                    <div className="flex gap-0.5 mt-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#93C5FD' }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#93C5FD' }} />
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-8 grid-rows-4 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {Array(32).fill(null).map((_, i) => {
                      const round = roadmapData[i];
                      return <DTAskRoadCell key={`ask-t-${i}`} result={round?.result} labels={{ dragon: t('dtRoadDragon'), tiger: t('dtRoadTiger'), tie: t('dtRoadTie') }} />;
                    })}
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="flex items-center justify-around py-1.5 bg-[#1a1f2e]">
                  <span className="text-red-500 font-bold text-sm">{t('dtRoadDragon')} <span className="text-white">{dragonWins}</span></span>
                  <span className="text-blue-500 font-bold text-sm">{t('dtRoadTiger')} <span className="text-white">{tigerWins}</span></span>
                  <span className="text-green-500 font-bold text-sm">{t('dtRoadTie')} <span className="text-white">{ties}</span></span>
                </div>
              </div>

              {/* Center: Betting Buttons */}
              <div className="flex-1 flex flex-col border-l border-r border-gray-400">
                {/* Row 1 - 龍雙/龍單/虎單/虎雙 */}
                <div className="flex h-[70px] border-b border-gray-400">
                  <button
                    onClick={() => handleBet('dragon_even')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_even') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-sm font-medium">{t('dragonEven')}</span>
                    <span className="text-red-600 text-xs">1:1.05</span>
                    {getBetAmount('dragon_even') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_even')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('dragon_odd')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_odd') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-sm font-medium">{t('dragonOdd')}</span>
                    <span className="text-red-600 text-xs">1:0.75</span>
                    {getBetAmount('dragon_odd') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_odd')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_odd')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_odd') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-sm font-medium">{t('tigerOdd')}</span>
                    <span className="text-red-600 text-xs">1:0.75</span>
                    {getBetAmount('tiger_odd') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_odd')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_even')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_even') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-sm font-medium">{t('tigerEven')}</span>
                    <span className="text-red-600 text-xs">1:1.05</span>
                    {getBetAmount('tiger_even') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_even')}</div>
                    )}
                  </button>
                </div>

                {/* Row 2 - 龍黑/龍紅/虎紅/虎黑 */}
                <div className="flex h-[70px] border-b border-gray-400">
                  <button
                    onClick={() => handleBet('dragon_black')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_black') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-sm font-medium">{t('dragonBlack')}</span>
                    <span className="text-red-600 text-xs">1:0.9</span>
                    {getBetAmount('dragon_black') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_black')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('dragon_red')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_red') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-sm font-medium">{t('dragonRed')}</span>
                    <span className="text-red-600 text-xs">1:0.9</span>
                    {getBetAmount('dragon_red') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_red')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_red')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_red') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-sm font-medium">{t('tigerRed')}</span>
                    <span className="text-red-600 text-xs">1:0.9</span>
                    {getBetAmount('tiger_red') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_red')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_black')}
                    disabled={!canBet}
                    className={`relative flex-1 flex flex-col items-center justify-center transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_black') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-sm font-medium">{t('tigerBlack')}</span>
                    <span className="text-red-600 text-xs">1:0.9</span>
                    {getBetAmount('tiger_black') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_black')}</div>
                    )}
                  </button>
                </div>

                {/* Row 3 - Main: 龍 / 和 / 虎 (large buttons) */}
                <div className="flex flex-1">
                  {/* 龍 - Blue background */}
                  <button
                    onClick={() => handleBet('dragon')}
                    disabled={!canBet}
                    className={`relative flex-[2] flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-5xl font-black">{t('dtDragon')}</span>
                    <span className="text-red-600 text-xl font-bold mt-1">1:1</span>
                    {getBetAmount('dragon') > 0 && (
                      <div className="absolute top-3 right-3 bg-yellow-500 text-black text-sm font-bold px-2.5 py-0.5 rounded-full shadow">{getBetAmount('dragon')}</div>
                    )}
                  </button>

                  {/* 和 - Yellow background */}
                  <button
                    onClick={() => handleBet('dt_tie')}
                    disabled={!canBet}
                    className={`relative flex-[1.2] flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dt_tie') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FEF9C3' }}
                  >
                    <span className="text-green-700 text-5xl font-black">{t('dtTie')}</span>
                    <span className="text-red-600 text-xl font-bold mt-1">1:8</span>
                    {getBetAmount('dt_tie') > 0 && (
                      <div className="absolute top-3 right-3 bg-yellow-500 text-black text-sm font-bold px-2.5 py-0.5 rounded-full shadow">{getBetAmount('dt_tie')}</div>
                    )}
                  </button>

                  {/* 虎 - Pink/Red background */}
                  <button
                    onClick={() => handleBet('tiger')}
                    disabled={!canBet}
                    className={`relative flex-[2] flex flex-col items-center justify-center transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-5xl font-black">{t('dtTiger')}</span>
                    <span className="text-red-600 text-xl font-bold mt-1">1:1</span>
                    {getBetAmount('tiger') > 0 && (
                      <div className="absolute top-3 right-3 bg-yellow-500 text-black text-sm font-bold px-2.5 py-0.5 rounded-full shadow">{getBetAmount('tiger')}</div>
                    )}
                  </button>
                </div>

                {/* Chips Row */}
                <div className="flex justify-center items-center gap-1.5 py-2 bg-[#1a1f2e]">
                  {CHIP_VALUES.map((value) => (
                    <Chip
                      key={value}
                      value={value}
                      selected={selectedChip === value}
                      onClick={() => setSelectedChip(value)}
                      disabled={value > balance}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Big Road + Derived Roads */}
              <div className="w-[22%] flex flex-col">
                {/* Big Road */}
                <div className="flex-1 p-1" style={{ backgroundColor: '#FFFFFF' }}>
                  <div className="grid grid-cols-10 grid-rows-6 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                    {Array(6).fill(null).flatMap((_, rowIndex) =>
                      Array(10).fill(null).map((_, colIndex) => {
                        const cell = bigRoadGrid[rowIndex]?.[colIndex];
                        return (
                          <DTBigRoadCell
                            key={`${rowIndex}-${colIndex}`}
                            result={cell?.result}
                            tieCount={cell?.tieCount}
                          />
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Three Derived Roads */}
                <div className="flex h-[72px] border-t border-gray-400">
                  <div className="flex-1 border-r border-gray-400" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(32).fill(null).map((_, i) => (
                        <DTDerivedRoadCell key={`bigEye-${i}`} value={undefined} type="big_eye" />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 border-r border-gray-400" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(32).fill(null).map((_, i) => (
                        <DTDerivedRoadCell key={`small-${i}`} value={undefined} type="small" />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(32).fill(null).map((_, i) => (
                        <DTDerivedRoadCell key={`cockroach-${i}`} value={undefined} type="cockroach" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="flex items-center justify-around py-1.5 bg-[#1a1f2e]">
                  <span className="text-red-500 font-bold text-sm">{t('dtRoadDragon')} <span className="text-white">{dragonWins}</span></span>
                  <span className="text-blue-500 font-bold text-sm">{t('dtRoadTiger')} <span className="text-white">{tigerWins}</span></span>
                  <span className="text-gray-400 text-sm">{t('total')} <span className="text-white">{total}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 bg-[#141922] border-l border-gray-800/50 flex flex-col">
          {/* Dealer Info */}
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{currentDealerName}</div>
                <div className="text-xs text-gray-400">@{shoeNumber} Round {roundNumber}</div>
                <div className="text-xs text-gray-500">Run 24</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={toggleFollowDealer}
                className={`text-xs flex items-center gap-1 ${isFollowingDealer ? 'text-pink-400' : 'text-gray-400 hover:text-pink-400'}`}
              >
                {isFollowingDealer ? <HeartOff className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                {isFollowingDealer ? t('unfollow') : t('follow')}
              </button>
              <span className="text-xs text-gray-500 flex items-center gap-0.5"><User className="w-3 h-3" /> 512</span>
              <span className="text-xs text-gray-500 flex items-center gap-0.5"><MapPin className="w-3 h-3" /> 1</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setIsTableSwitchOpen(true)}
                className="flex-1 text-xs py-1 bg-[#1e2a3a] rounded text-gray-300 hover:bg-[#2a3a4a] transition"
              >
                {t('switchTable')}
              </button>
              <button className="flex-1 text-xs py-1 bg-[#1e2a3a] rounded text-gray-300 hover:bg-[#2a3a4a] transition">
                {t('multiTables')}
              </button>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex justify-between mb-3">
              <span className="text-red-400 font-bold">{t('dtDragon').toUpperCase()}</span>
              <span className="text-blue-400 font-bold">{t('dtTiger').toUpperCase()}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{dragonWins} / {total}</span>
                <span className="text-gray-400">{tigerWins} / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t('dtTie')}</span>
                <span>{ties} / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t('dragonOdd')}/{t('dragonEven')}</span>
                <span>- / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t('tigerOdd')}/{t('tigerEven')}</span>
                <span>- / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t('dragonRed')}/{t('dragonBlack')}</span>
                <span>- / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t('tigerRed')}/{t('tigerBlack')}</span>
                <span>- / {total}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between text-xs">
              <span className="text-gray-400">{t('wager')}</span>
              <span className="text-white">{totalBet.toLocaleString()}</span>
            </div>
          </div>

          {/* Chat Area */}
          <div ref={chatContainerRef} className="flex-1 p-3 overflow-y-auto">
            {chatLoading ? (
              <div className="text-center text-gray-500 text-xs">{t('loading')}...</div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 text-xs">{t('noData')}</div>
            ) : (
              <div className="space-y-2 text-xs">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <span className="text-pink-400 shrink-0">{msg.username}</span>
                    <span className="text-gray-300 break-all">{msg.message}</span>
                    <span className="text-gray-600 ml-auto shrink-0">{formatChatTime(msg.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-gray-800/50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={t('betOver100')}
                className="flex-1 bg-[#1e2a3a] text-white text-xs px-3 py-2 rounded outline-none"
                maxLength={500}
              />
              <button
                onClick={() => setIsGiftOpen(true)}
                className="text-gray-500 hover:text-pink-400 transition"
              >
                <Gift className="w-4 h-4" />
              </button>
              <button className="text-gray-500 hover:text-gray-300"><Smile className="w-4 h-4" /></button>
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className="text-orange-400 hover:text-orange-300 disabled:text-gray-600"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Menu Links */}
          <div className="p-3 border-t border-gray-800/50 space-y-1">
            <button
              onClick={() => setIsFollowingOpen(true)}
              className="w-full text-left text-xs text-pink-400 flex items-center gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2"
            >
              <Heart className="w-3 h-3" /> {t('followingList')}
            </button>
            <button
              onClick={() => setIsProportionOpen(true)}
              className="w-full text-left text-xs text-gray-400 flex items-center gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2"
            >
              <BarChart2 className="w-3 h-3" /> {t('resultsProportion')}
            </button>
            <button
              onClick={() => setIsReportOpen(true)}
              className="w-full text-left text-xs text-gray-400 flex items-center gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2"
            >
              <FileText className="w-3 h-3" /> {t('gameReport')}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full text-left text-xs text-gray-400 flex items-center gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2"
            >
              <Settings className="w-3 h-3" /> {t('gameSettings')}
            </button>
            <button
              onClick={() => setIsRulesOpen(true)}
              className="w-full text-left text-xs text-gray-400 flex items-center gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2"
            >
              <HelpCircle className="w-3 h-3" /> {t('gameRules')}
            </button>
            <button className="w-full text-left text-xs text-gray-400 flex items-center gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2">
              <Video className="w-3 h-3" /> {t('liveScene')}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GameSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <GameReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
      <FollowingListModal isOpen={isFollowingOpen} onClose={() => setIsFollowingOpen(false)} />
      <TableSwitchModal
        isOpen={isTableSwitchOpen}
        onClose={() => setIsTableSwitchOpen(false)}
        currentTableId="1"
      />
      <GiftModal
        isOpen={isGiftOpen}
        onClose={() => setIsGiftOpen(false)}
        dealerName={currentDealerName}
        balance={balance}
      />
      <ResultsProportionModal isOpen={isProportionOpen} onClose={() => setIsProportionOpen(false)} />

      {/* Bet Success Notification Toast */}
      <AnimatePresence>
        {betNotification.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-16 left-1/2 z-[100] bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-lg shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1">{t('betSuccess')}</div>
                <div className="text-xs space-y-0.5">
                  {betNotification.bets.map((bet, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span>{betTypeLabels[bet.type] || bet.type}</span>
                      <span className="font-bold">¥{bet.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 pt-1 border-t border-white/20 text-xs font-bold flex justify-between">
                  <span>{t('total')}</span>
                  <span>¥{betNotification.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
