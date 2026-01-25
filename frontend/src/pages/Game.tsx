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
  Coins,
} from 'lucide-react';
import { MobileNavBar } from '../components/layout/MobileNavBar';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useGameSocket } from '../hooks/useGameSocket';
import type { BetType, GameResult } from '../types';
import {
  GameSettingsModal,
  GameRulesModal,
  GameReportModal,
  FollowingListModal,
  TableSwitchModal,
  GiftModal,
  ResultsProportionModal,
} from '../components/game/modals';
import PlayingCard from '../components/game/PlayingCard';
import ChipSettingsModal from '../components/game/ChipSettingsModal';

// Chip component - Casino style with edge notches (matches ChipSettingsModal)
function Chip({ value, selected, onClick, disabled }: { value: number | string; selected: boolean; onClick: () => void; disabled?: boolean }) {
  // Chip colors matching ALL_CHIP_OPTIONS from gameStore.ts
  const chipColors: Record<number, string> = {
    10: 'from-slate-400 to-slate-600',
    50: 'from-green-500 to-green-700',
    100: 'from-red-500 to-red-700',
    500: 'from-purple-500 to-purple-700',
    1000: 'from-amber-500 to-amber-700',
    5000: 'from-cyan-500 to-cyan-700',
    10000: 'from-fuchsia-500 to-fuchsia-700',
    20000: 'from-rose-500 to-rose-700',
    50000: 'from-indigo-500 to-indigo-700',
    100000: 'from-yellow-500 to-yellow-700',
  };

  const color = typeof value === 'number' ? (chipColors[value] || 'from-gray-500 to-gray-700') : 'from-gray-500 to-gray-700';

  // Format chip value display
  const formatValue = (v: number | string) => {
    if (typeof v === 'string') return v;
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
      {/* Inner circle decoration */}
      <div className="absolute inset-2 rounded-full border-2 border-white/20" />

      {/* Chip value */}
      <span className="relative z-10 text-white font-black drop-shadow-lg text-[10px]">
        {formatValue(value)}
      </span>

      {/* Glossy effect */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
        }}
      />

      {/* Edge notches (casino chip style) */}
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

// Ask Road Cell (問路) - Shows 莊/閒/和 in circles with colored borders
function AskRoadCell({ result, labels }: { result?: GameResult; labels: { banker: string; player: string; tie: string } }) {
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        {/* Empty cell */}
      </div>
    );
  }

  // Circle style: colored border and text
  const styles = {
    banker: { border: '#DC2626', text: '#FFFFFF', bg: '#DC2626' },  // Red filled for 莊
    player: { border: '#2563EB', text: '#FFFFFF', bg: '#2563EB' },  // Blue filled for 閒
    tie: { border: '#16A34A', text: '#FFFFFF', bg: '#16A34A' },     // Green filled for 和
  };

  const style = styles[result];

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
        {labels[result]}
      </div>
    </div>
  );
}

// Big Road Cell (大路) - Standard baccarat big road display
// Perfect circles: Red = Banker, Blue = Player
// Tie count shown as green line or number
// Pairs shown as dots: top-left red = banker pair, bottom-right blue = player pair
function BigRoadCell({ result, tieCount = 0, bankerPair, playerPair }: { result?: 'player' | 'banker'; tieCount?: number; bankerPair?: boolean; playerPair?: boolean }) {
  if (!result) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors = {
    banker: { border: '#DC2626' },  // Red for Banker
    player: { border: '#2563EB' },  // Blue for Player
  };
  const color = colors[result];

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white">
      {/* Main circle - perfect circle, hollow */}
      <div
        className="w-5 h-5 rounded-full"
        style={{ border: `2px solid ${color.border}` }}
      />

      {/* Banker pair indicator - red dot at top-left */}
      {bankerPair && (
        <div
          className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#DC2626' }}
        />
      )}

      {/* Player pair indicator - blue dot at bottom-right */}
      {playerPair && (
        <div
          className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#2563EB' }}
        />
      )}

      {/* Tie indicator - green line through circle, or number if multiple ties */}
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

// Derived Road Cell (大眼仔, 小路, 蟑螂路) - Different styles matching reference
function DerivedRoadCell({ value, type }: { value?: 'red' | 'blue'; type: 'big_eye' | 'small' | 'cockroach' }) {
  if (!value) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors = {
    red: { border: '#DC2626', fill: '#DC2626' },
    blue: { border: '#2563EB', fill: '#2563EB' },
  };
  const color = colors[value];

  // Big Eye Boy: hollow circles (border only)
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

  // Small Road: filled circles
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

  // Cockroach Pig: diagonal slashes
  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <svg viewBox="0 0 10 10" className="w-3 h-3">
        <line x1="2" y1="8" x2="8" y2="2" stroke={color.fill} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Suit symbol mapping for card preview
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// Calculate Big Eye Boy road
function calculateBigEyeBoy(bigRoadGrid: ({ result: 'player' | 'banker'; tieCount: number } | null)[][]): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const ROWS = 6;

  // Get column lengths from big road
  const getColumnLength = (col: number): number => {
    let length = 0;
    for (let row = 0; row < ROWS; row++) {
      if (bigRoadGrid[row]?.[col]) length++;
    }
    return length;
  };

  // Find max column with data
  let maxCol = 0;
  for (let col = 0; col < 20; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (bigRoadGrid[row]?.[col]) maxCol = col;
    }
  }

  // Start from column 2 (comparing with column 1)
  for (let col = 1; col <= maxCol; col++) {
    const currLen = getColumnLength(col);
    const prevLen = getColumnLength(col - 1);

    if (currLen > 1) {
      // Compare current column's entries with previous column
      for (let entry = 1; entry < currLen; entry++) {
        // Red = same pattern (both have entry at this depth or both don't)
        // Blue = different pattern
        const prevHasEntry = entry < prevLen;
        results.push(prevHasEntry ? 'red' : 'blue');
      }
    }
  }

  return results;
}

// Calculate Small Road (compare with column - 2)
function calculateSmallRoad(bigRoadGrid: ({ result: 'player' | 'banker'; tieCount: number } | null)[][]): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const ROWS = 6;

  const getColumnLength = (col: number): number => {
    let length = 0;
    for (let row = 0; row < ROWS; row++) {
      if (bigRoadGrid[row]?.[col]) length++;
    }
    return length;
  };

  let maxCol = 0;
  for (let col = 0; col < 20; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (bigRoadGrid[row]?.[col]) maxCol = col;
    }
  }

  // Start from column 3 (comparing with column 1)
  for (let col = 2; col <= maxCol; col++) {
    const currLen = getColumnLength(col);
    const compareLen = getColumnLength(col - 2);

    if (currLen > 1) {
      for (let entry = 1; entry < currLen; entry++) {
        const compareHasEntry = entry < compareLen;
        results.push(compareHasEntry ? 'red' : 'blue');
      }
    }
  }

  return results;
}

// Calculate Cockroach Pig (compare with column - 3)
function calculateCockroachPig(bigRoadGrid: ({ result: 'player' | 'banker'; tieCount: number } | null)[][]): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const ROWS = 6;

  const getColumnLength = (col: number): number => {
    let length = 0;
    for (let row = 0; row < ROWS; row++) {
      if (bigRoadGrid[row]?.[col]) length++;
    }
    return length;
  };

  let maxCol = 0;
  for (let col = 0; col < 20; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (bigRoadGrid[row]?.[col]) maxCol = col;
    }
  }

  // Start from column 4 (comparing with column 1)
  for (let col = 3; col <= maxCol; col++) {
    const currLen = getColumnLength(col);
    const compareLen = getColumnLength(col - 3);

    if (currLen > 1) {
      for (let entry = 1; entry < currLen; entry++) {
        const compareHasEntry = entry < compareLen;
        results.push(compareHasEntry ? 'red' : 'blue');
      }
    }
  }

  return results;
}

// Build Big Road data structure - Standard baccarat big road
// Red circles = Banker wins, Blue circles = Player wins
// Green line/number on circle = Tie count after that result
// Red dot top-left = Banker pair, Blue dot bottom-right = Player pair
function buildBigRoad(data: Array<{ result: GameResult; playerPair?: boolean; bankerPair?: boolean }>) {
  const ROWS = 6;
  const COLS = 20;
  const grid: ({ result: 'player' | 'banker'; tieCount: number; bankerPair: boolean; playerPair: boolean } | null)[][] =
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

  if (data.length === 0) return grid;

  let col = 0;
  let row = 0;
  let lastResult: 'player' | 'banker' | null = null;
  let tieCount = 0;

  for (const round of data) {
    // Tie doesn't create new cell, just increment counter
    if (round.result === 'tie') {
      tieCount++;
      continue;
    }

    // New column if result changes
    if (lastResult === null || round.result !== lastResult) {
      if (lastResult !== null) {
        col++;
        row = 0;
      }
      lastResult = round.result;
    } else {
      // Same result - go down in same column
      row++;
      // Dragon tail - if past row 6, continue horizontally
      if (row >= ROWS) {
        row = ROWS - 1;
        col++;
      }
    }

    if (col < COLS && row < ROWS) {
      grid[row][col] = {
        result: round.result,
        tieCount,
        bankerPair: round.bankerPair || false,
        playerPair: round.playerPair || false
      };
      tieCount = 0; // Reset tie count after placing
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

export default function Game() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Get tableId from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const tableId = searchParams.get('table') || undefined;

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

  // 免佣模式 (No Commission mode)
  // 普通模式：莊贏賠率 1:0.95 (抽5%佣金)
  // 免佣模式：莊贏賠率 1:1，但莊家以6點贏只賠 1:0.5
  const [isNoCommission, setIsNoCommission] = useState(false);

  // Chip settings modal
  const [isChipSettingsOpen, setIsChipSettingsOpen] = useState(false);

  // Bet success notification
  const [betNotification, setBetNotification] = useState<{
    show: boolean;
    bets: Array<{ type: string; amount: number }>;
    total: number;
  }>({ show: false, bets: [], total: 0 });

  // Previous confirmed bets count to detect new confirmations
  const prevConfirmedBetsRef = useRef<number>(0);

  // Current dealer name (could come from table selection in the future)
  const currentDealerName = '花花';

  // Check initial follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const res = await dealerApi.isFollowing(currentDealerName);
        setIsFollowingDealer(res.data.isFollowing);
      } catch (err) {
        console.error('[Game] Failed to check follow status:', err);
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
        console.error('[Game] Failed to fetch leaderboard:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [leaderboardPeriod]);

  // Socket hook for WebSocket connection
  const { submitBets } = useGameSocket(tableId);

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

  // Handle send chat
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  // Format chat time
  const formatChatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Handle dealer follow toggle
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
      console.error('[Game] Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Game state from store
  const {
    isConnected,
    phase,
    timeRemaining,
    roundNumber,
    balance,
    pendingBets,
    confirmedBets,
    addPendingBet,
    getPendingTotal,
    getConfirmedTotal,
    getBetAmount,
    selectedChip,
    setSelectedChip,
    playerCards,
    bankerCards,
    playerPoints,
    bankerPoints,
    lastResult,
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
    loadRepeatBets,
    bettingLimits,
    displayedChips,
    clearPendingBets,
  } = useGameStore();

  // Can place bets only during betting phase
  const canBet = phase === 'betting' && isConnected;

  // Calculate totals
  const totalBet = getPendingTotal() + getConfirmedTotal();

  // Stats from roadmap
  const bankerWins = roadmapData.filter(r => r.result === 'banker').length;
  const playerWins = roadmapData.filter(r => r.result === 'player').length;
  const ties = roadmapData.filter(r => r.result === 'tie').length;
  const total = roadmapData.length;

  // Pair statistics
  const playerPairCount = roadmapData.filter(r => r.playerPair).length;
  const bankerPairCount = roadmapData.filter(r => r.bankerPair).length;

  // SUPER 6: 莊家以 6 點贏
  const super6Count = roadmapData.filter(r =>
    r.result === 'banker' && r.bankerPoints === 6
  ).length;

  // Small: 總牌數 = 4
  const smallCount = roadmapData.filter(r => r.totalCards === 4).length;

  // Big: 總牌數 = 5 或 6
  const bigCount = roadmapData.filter(r =>
    r.totalCards === 5 || r.totalCards === 6
  ).length;

  // P. BONUS: 閒贏且點數差 >= 4 (龍寶)
  const pBonusCount = roadmapData.filter(r =>
    r.result === 'player' &&
    r.playerPoints !== undefined &&
    r.bankerPoints !== undefined &&
    (r.playerPoints - r.bankerPoints) >= 4
  ).length;

  // B. BONUS: 莊贏且點數差 >= 4 (龍寶)
  const bBonusCount = roadmapData.filter(r =>
    r.result === 'banker' &&
    r.playerPoints !== undefined &&
    r.bankerPoints !== undefined &&
    (r.bankerPoints - r.playerPoints) >= 4
  ).length;

  const bigRoadGrid = buildBigRoad(roadmapData);

  // Calculate derived roads
  const bigEyeBoyData = calculateBigEyeBoy(bigRoadGrid);
  const smallRoadData = calculateSmallRoad(bigRoadGrid);
  const cockroachPigData = calculateCockroachPig(bigRoadGrid);

  // Bet type labels (Chinese)
  const betTypeLabels: Record<string, string> = {
    player: '闲',
    banker: '庄',
    tie: '和',
    player_pair: '闲对',
    banker_pair: '庄对',
    super_six: 'Super 6',
    player_bonus: '闲龙宝',
    banker_bonus: '庄龙宝',
  };

  // Show bet success notification when confirmedBets changes
  useEffect(() => {
    const currentCount = confirmedBets.length;
    const prevCount = prevConfirmedBetsRef.current;

    // Only show notification when bets are newly confirmed (count increased)
    if (currentCount > 0 && currentCount > prevCount && phase === 'betting') {
      const total = confirmedBets.reduce((sum, b) => sum + b.amount, 0);
      setBetNotification({
        show: true,
        bets: confirmedBets.map(b => ({ type: b.type, amount: b.amount })),
        total,
      });

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setBetNotification(prev => ({ ...prev, show: false }));
      }, 3000);

      return () => clearTimeout(timer);
    }

    prevConfirmedBetsRef.current = currentCount;
  }, [confirmedBets, phase]);

  // Reset notification reference when round changes
  useEffect(() => {
    prevConfirmedBetsRef.current = 0;
  }, [roundNumber]);

  // Phase display
  const phaseDisplay = getPhaseDisplay(phase, timeRemaining, t);

  // Handle bet click
  const handlePlaceBet = (type: BetType) => {
    if (!canBet) return;
    addPendingBet(type);
  };

  // Handle confirm - send pending bets to server
  const handleConfirm = () => {
    if (pendingBets.length === 0) return;
    submitBets(isNoCommission);
  };

  // Handle cancel - only clear pending bets (not confirmed)
  const handleCancel = () => {
    clearPendingBets();
  };

  // Handle repeat - load last round's bets
  const handleRepeat = () => {
    if (!canBet) return;
    const success = loadRepeatBets();
    if (!success) {
      // Could show toast notification here
      console.log('[Game] Repeat failed: no last bets or insufficient balance');
    }
  };

  // Net result from last settlement
  const netResult = lastSettlement?.netResult || 0;
  const showResult = phase === 'result' && lastResult !== null;

  return (
    <div className="h-screen bg-[#1a1f2e] text-white flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-11 bg-[#0d1117] flex items-center justify-between px-2 sm:px-4 border-b border-gray-800/50">
        {/* Left - Back & Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="p-1 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="hidden sm:block p-1 text-gray-400 hover:text-white">
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRulesOpen(true)}
            className="hidden sm:block p-1 text-gray-400 hover:text-white"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
          {/* Connection Status */}
          <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{isConnected ? t('live') : t('offline')}</span>
          </div>
        </div>

        {/* Center - Balance (mobile) */}
        <div className="xl:hidden flex items-center gap-2">
          <span className="text-amber-400 font-bold text-sm">${balance.toLocaleString()}</span>
        </div>

        {/* Right - Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleMute}
            className="p-1 text-gray-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="hidden sm:block p-1 text-gray-400 hover:text-white"
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - User Info (hidden on mobile/tablet) */}
        <div className="hidden xl:flex w-60 bg-[#141922] border-r border-gray-800/50 flex-col shrink-0">
          {/* OFA LIVE Header */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-orange-500 font-bold tracking-wider">
                <span className="text-lg">OFA</span>
                <span className="text-sm text-gray-400">{t('live')}</span>
              </div>
              {/* Language Toggle */}
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
              <span>
                {bettingLimits
                  ? `${bettingLimits.player.min.toLocaleString()}-${(bettingLimits.player.max / 1000).toFixed(0)}K`
                  : '10-100K'}
              </span>
            </div>
          </div>

          {/* Billboard Section */}
          <div className="flex-1 p-4">
            <div className="bg-gradient-to-b from-orange-500/20 to-transparent rounded-t-lg p-2 mb-2">
              <span className="text-orange-400 font-bold text-sm">{t('billboard')}</span>
            </div>

            {/* Tabs */}
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

                {/* Rankings list */}
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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Area - Takes remaining space */}
          <div className="flex-1 relative bg-gradient-to-br from-[#2d1f4e] via-[#1a1535] to-[#0f1525] overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
            </div>

            {/* Card Preview Icons - Above Score */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-12 z-20">
              {/* Player Cards Preview */}
              <div className="flex gap-1 bg-blue-900/80 rounded px-2 py-1">
                {playerCards.length > 0 ? (
                  playerCards.slice(0, 2).map((card, i) => (
                    <div key={i} className="flex items-center text-xs font-bold">
                      <span className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-white'}>
                        {SUIT_SYMBOLS[card.suit]}{card.rank}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs">--</span>
                )}
              </div>

              {/* Banker Cards Preview */}
              <div className="flex gap-1 bg-red-900/80 rounded px-2 py-1">
                {bankerCards.length > 0 ? (
                  bankerCards.slice(0, 2).map((card, i) => (
                    <div key={i} className="flex items-center text-xs font-bold">
                      <span className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-white'}>
                        {SUIT_SYMBOLS[card.suit]}{card.rank}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs">--</span>
                )}
              </div>
            </div>

            {/* Score Display - Below Card Preview */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
              {/* Player Score */}
              <div className="flex items-center">
                <div className="bg-blue-600 text-white px-3 py-1 rounded-l font-bold">
                  P <span className="text-xs">{t('player').toUpperCase()}</span>
                </div>
                <div className="bg-black/80 text-white px-4 py-1 text-2xl font-bold min-w-[50px] text-center">
                  {playerPoints ?? '-'}
                </div>
              </div>

              {/* Banker Score */}
              <div className="flex items-center">
                <div className="bg-black/80 text-white px-4 py-1 text-2xl font-bold min-w-[50px] text-center">
                  {bankerPoints ?? '-'}
                </div>
                <div className="bg-red-600 text-white px-3 py-1 rounded-r font-bold">
                  <span className="text-xs">{t('banker').toUpperCase()}</span> B
                </div>
              </div>
            </div>

            {/* Round Info */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 rounded px-3 py-1 text-sm z-20">
              <span className="text-gray-400">{t('baccarat')} {shoeNumber}</span>
              <span className="text-white ml-2">{new Date().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`ml-2 font-bold ${phaseDisplay.color}`}>{roundNumber} - {phaseDisplay.text}</span>
            </div>

            {/* Dealer placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Dealer avatar placeholder */}
                <div className="w-48 h-64 bg-gradient-to-b from-gray-600/50 to-gray-800/50 rounded-lg border border-gray-600/30 flex items-center justify-center">
                  <User className="w-20 h-20 text-gray-500/50" />
                </div>

                {/* Cards Display */}
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex gap-24">
                  {/* Player Cards */}
                  <div className="flex flex-col items-center">
                    {/* Third card - above, rotated 90 degrees */}
                    {playerCards.length > 2 && (
                      <motion.div
                        className="mb-1"
                        initial={{ rotateY: 180, opacity: 0 }}
                        animate={{ rotateY: 0, rotateZ: 90, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <PlayingCard card={playerCards[2]} size="sm" />
                      </motion.div>
                    )}
                    {/* First two cards - horizontal */}
                    <div className="flex gap-1">
                      {playerCards.length > 0 ? (
                        playerCards.slice(0, 2).map((card, i) => (
                          <motion.div
                            key={`player-${i}`}
                            initial={{ rotateY: 180, opacity: 0, y: -50 }}
                            animate={{ rotateY: 0, opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                          >
                            <PlayingCard card={card} />
                          </motion.div>
                        ))
                      ) : (
                        <>
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown />
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Banker Cards */}
                  <div className="flex flex-col items-center">
                    {/* Third card - above, rotated 90 degrees */}
                    {bankerCards.length > 2 && (
                      <motion.div
                        className="mb-1"
                        initial={{ rotateY: 180, opacity: 0 }}
                        animate={{ rotateY: 0, rotateZ: 90, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <PlayingCard card={bankerCards[2]} size="sm" />
                      </motion.div>
                    )}
                    {/* First two cards - horizontal */}
                    <div className="flex gap-1">
                      {bankerCards.length > 0 ? (
                        bankerCards.slice(0, 2).map((card, i) => (
                          <motion.div
                            key={`banker-${i}`}
                            initial={{ rotateY: 180, opacity: 0, y: -50 }}
                            animate={{ rotateY: 0, opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                          >
                            <PlayingCard card={card} />
                          </motion.div>
                        ))
                      ) : (
                        <>
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown />
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown />
                        </>
                      )}
                    </div>
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
                      lastResult === 'player' ? 'text-blue-400' :
                      lastResult === 'banker' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {lastResult === 'player' ? t('playerWins') :
                       lastResult === 'banker' ? t('bankerWins') : t('tieResult')}
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

            {/* Zoom controls */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
              <button className="w-8 h-8 bg-black/50 rounded flex items-center justify-center text-gray-400 hover:text-white">+</button>
              <button className="w-8 h-8 bg-black/50 rounded flex items-center justify-center text-gray-400 hover:text-white">-</button>
            </div>
          </div>

          {/* Betting Panel */}
          <div className="bg-[#0d1117]">
            {/* Control Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-2 sm:px-4 py-2 gap-2 border-b border-gray-800/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-xs text-gray-400">{t('switchPlay')}</span>
                <span className="text-xs text-gray-500">{t('noComm')}</span>
                <button
                  onClick={() => setIsNoCommission(!isNoCommission)}
                  className={`px-2 py-0.5 text-xs rounded transition ${
                    isNoCommission
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {isNoCommission ? t('on') || '開' : t('off') || '關'}
                </button>
              </div>
              <div className="hidden xl:flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={!canBet || pendingBets.length === 0}
                  className="flex items-center gap-1 px-3 py-1 text-gray-400 hover:text-white text-xs disabled:opacity-50"
                >
                  <X className="w-3 h-3" /> {t('cancel')}
                </button>
                <button
                  onClick={handleRepeat}
                  disabled={!canBet || lastBets.length === 0}
                  className="flex items-center gap-1 px-3 py-1 text-gray-400 hover:text-white text-xs disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" /> {t('repeat')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canBet || pendingBets.length === 0}
                  className="flex items-center gap-1 px-4 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs rounded font-bold disabled:opacity-50"
                >
                  <Check className="w-3 h-3" /> {t('confirm')}
                </button>
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <button className="text-xs text-gray-400 hover:text-white">{t('signal')}</button>
                <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                  <Video className="w-3 h-3" /> {t('liveCheck')}
                </button>
                <button className="text-xs text-orange-400 hover:text-orange-300">{t('gifts')}</button>
              </div>
            </div>

            {/* Betting Areas - Full Width - Exact match to reference image */}
            <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[200px] lg:h-[360px] pb-16 xl:pb-0" style={{ backgroundColor: '#FFFFFF' }}>
              {/* Left: Ask Roads (莊問路 / 閒問路) - Hidden on mobile */}
              <div className="hidden lg:flex lg:w-[22%] flex-col">
                {/* 莊問路 */}
                <div className="flex flex-1 border-b border-gray-400">
                  {/* Vertical red label */}
                  <div
                    className="w-7 flex flex-col items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    <span className="writing-vertical tracking-wider">莊問路</span>
                    <div className="flex gap-0.5 mt-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FCA5A5' }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FCA5A5' }} />
                    </div>
                  </div>
                  {/* Grid cells - single line grid using gap with gray background */}
                  <div className="flex-1 grid grid-cols-8 grid-rows-4 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {Array(32).fill(null).map((_, i) => {
                      const round = roadmapData[i];
                      return <AskRoadCell key={`ask-b-${i}`} result={round?.result} labels={{ banker: t('roadBanker'), player: t('roadPlayer'), tie: t('roadTie') }} />;
                    })}
                  </div>
                </div>

                {/* 閒問路 */}
                <div className="flex flex-1 border-b border-gray-400">
                  {/* Vertical blue label */}
                  <div
                    className="w-7 flex flex-col items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    <span className="writing-vertical tracking-wider">閒問路</span>
                    <div className="flex gap-0.5 mt-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#93C5FD' }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#93C5FD' }} />
                    </div>
                  </div>
                  {/* Grid cells - single line grid using gap with gray background */}
                  <div className="flex-1 grid grid-cols-8 grid-rows-4 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {Array(32).fill(null).map((_, i) => {
                      const round = roadmapData[i];
                      return <AskRoadCell key={`ask-p-${i}`} result={round?.result} labels={{ banker: t('roadBanker'), player: t('roadPlayer'), tie: t('roadTie') }} />;
                    })}
                  </div>
                </div>

                {/* Bottom Stats - 莊/閒/和 counts */}
                <div className="flex items-center justify-around py-1.5 bg-[#1a1f2e]">
                  <span className="text-red-500 font-bold text-sm">{t('roadBanker')} <span className="text-white">{bankerWins}</span></span>
                  <span className="text-blue-500 font-bold text-sm">{t('roadPlayer')} <span className="text-white">{playerWins}</span></span>
                  <span className="text-green-500 font-bold text-sm">{t('roadTie')} <span className="text-white">{ties}</span></span>
                </div>
              </div>

              {/* Center: Betting Buttons */}
              <div className="flex-1 flex flex-col border-l border-r border-gray-400">
                {/* Top Row - Side bets (5 buttons) */}
                <div className="flex flex-wrap lg:flex-nowrap h-auto lg:h-[95px] border-b border-gray-400">
                  {/* 閒龍寶 - Player Dragon Bonus */}
                  <button
                    onClick={() => handlePlaceBet('player_bonus')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('player_bonus') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#E0F2FE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('playerBonus')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:30</span>
                    {getBetAmount('player_bonus') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('player_bonus')}</div>
                    )}
                  </button>

                  {/* 閒對 - Light blue */}
                  <button
                    onClick={() => handlePlaceBet('player_pair')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('player_pair') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#F0F4FF' }}
                  >
                    <span className="text-gray-800 text-xs sm:text-sm font-medium">{t('playerPair')}</span>
                    <span className="text-red-600 text-xs sm:text-sm font-bold">1:11</span>
                    {getBetAmount('player_pair') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('player_pair')}</div>
                    )}
                  </button>

                  {/* Super 6 - Light green with purple text */}
                  <button
                    onClick={() => handlePlaceBet('super_six')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('super_six') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#F0FFF4' }}
                  >
                    <span className="text-purple-700 text-[8px] sm:text-[10px] font-bold tracking-wider">SUPER</span>
                    <span className="text-purple-700 text-xl sm:text-3xl font-black leading-none">6</span>
                    <span className="text-red-600 text-[8px] sm:text-[10px]">1:12/1:20</span>
                    {getBetAmount('super_six') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('super_six')}</div>
                    )}
                  </button>

                  {/* 莊對 - Light pink */}
                  <button
                    onClick={() => handlePlaceBet('banker_pair')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('banker_pair') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFF0F0' }}
                  >
                    <span className="text-gray-800 text-xs sm:text-sm font-medium">{t('bankerPair')}</span>
                    <span className="text-red-600 text-xs sm:text-sm font-bold">1:11</span>
                    {getBetAmount('banker_pair') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('banker_pair')}</div>
                    )}
                  </button>

                  {/* 莊龍寶 - Banker Dragon Bonus */}
                  <button
                    onClick={() => handlePlaceBet('banker_bonus')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-b lg:border-b-0 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('banker_bonus') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FEE2E2' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('bankerBonus')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:30</span>
                    {getBetAmount('banker_bonus') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('banker_bonus')}</div>
                    )}
                  </button>
                </div>

                {/* Main Row - 閒 / 和 / 莊 (large buttons) */}
                <div className="flex flex-1">
                  {/* 閒 - Blue background */}
                  <button
                    onClick={() => handlePlaceBet('player')}
                    disabled={!canBet}
                    className={`relative flex-[2] py-4 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('player') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-3xl sm:text-4xl lg:text-5xl font-black">{t('player')}</span>
                    <span className="text-red-600 text-base sm:text-lg lg:text-xl font-bold mt-1">1:1</span>
                    {getBetAmount('player') > 0 && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow">{getBetAmount('player')}</div>
                    )}
                  </button>

                  {/* 和 - Yellow background */}
                  <button
                    onClick={() => handlePlaceBet('tie')}
                    disabled={!canBet}
                    className={`relative flex-[1.2] py-4 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tie') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FEF9C3' }}
                  >
                    <span className="text-green-700 text-3xl sm:text-4xl lg:text-5xl font-black">{t('tie')}</span>
                    <span className="text-red-600 text-base sm:text-lg lg:text-xl font-bold mt-1">1:8</span>
                    {getBetAmount('tie') > 0 && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow">{getBetAmount('tie')}</div>
                    )}
                  </button>

                  {/* 莊 - Pink/Red background */}
                  <button
                    onClick={() => handlePlaceBet('banker')}
                    disabled={!canBet}
                    className={`relative flex-[2] py-4 sm:py-6 lg:py-0 flex flex-col items-center justify-center transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('banker') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-3xl sm:text-4xl lg:text-5xl font-black">{t('banker')}</span>
                    <span className="text-red-600 text-base sm:text-lg lg:text-xl font-bold mt-1">
                      {isNoCommission ? '1:1' : '1:0.95'}
                    </span>
                    {isNoCommission && (
                      <span className="text-red-500 text-[10px] sm:text-xs">(6點贏 1:0.5)</span>
                    )}
                    {getBetAmount('banker') > 0 && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow">{getBetAmount('banker')}</div>
                    )}
                  </button>
                </div>

                {/* Chips Row */}
                <div className="flex justify-start lg:justify-center items-center gap-1 sm:gap-1.5 py-2 px-2 bg-[#1a1f2e] overflow-x-auto scrollbar-hide">
                  {displayedChips.map((value) => (
                    <Chip
                      key={value}
                      value={value}
                      selected={selectedChip === value}
                      onClick={() => setSelectedChip(value)}
                      disabled={value > balance}
                    />
                  ))}
                  {/* Chip Settings Button */}
                  <button
                    onClick={() => setIsChipSettingsOpen(true)}
                    className="relative w-14 h-14 rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-gray-500 to-gray-700 border-4 border-white/30 shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
                    title={t('chipSettings') || '籌碼設置'}
                  >
                    {/* Inner circle decoration */}
                    <div className="absolute inset-2 rounded-full border-2 border-white/20" />

                    {/* Icon */}
                    <Coins className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />

                    {/* Glossy effect */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                      }}
                    />

                    {/* Edge notches */}
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
                </div>
              </div>

              {/* Right: Big Road + Derived Roads - Hidden on mobile */}
              <div className="hidden lg:flex lg:w-[22%] flex-col">
                {/* Big Road - circles with numbers */}
                <div className="flex-1 p-1" style={{ backgroundColor: '#FFFFFF' }}>
                  <div className="grid grid-cols-10 grid-rows-6 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                    {Array(6).fill(null).flatMap((_, rowIndex) =>
                      Array(10).fill(null).map((_, colIndex) => {
                        const cell = bigRoadGrid[rowIndex]?.[colIndex];
                        return (
                          <BigRoadCell
                            key={`${rowIndex}-${colIndex}`}
                            result={cell?.result}
                            tieCount={cell?.tieCount}
                            bankerPair={cell?.bankerPair}
                            playerPair={cell?.playerPair}
                          />
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Three Derived Roads - side by side */}
                <div className="flex h-[72px] border-t border-gray-400">
                  {/* Big Eye Boy - hollow circles */}
                  <div className="flex-1 border-r border-gray-400" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(32).fill(null).map((_, i) => (
                        <DerivedRoadCell key={`bigEye-${i}`} value={bigEyeBoyData[i]} type="big_eye" />
                      ))}
                    </div>
                  </div>

                  {/* Small Road - filled circles */}
                  <div className="flex-1 border-r border-gray-400" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(32).fill(null).map((_, i) => (
                        <DerivedRoadCell key={`small-${i}`} value={smallRoadData[i]} type="small" />
                      ))}
                    </div>
                  </div>

                  {/* Cockroach Pig - slashes */}
                  <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(32).fill(null).map((_, i) => (
                        <DerivedRoadCell key={`cockroach-${i}`} value={cockroachPigData[i]} type="cockroach" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Stats - 莊對/閒對/總數 */}
                <div className="flex items-center justify-around py-1.5 bg-[#1a1f2e]">
                  <span className="text-red-500 font-bold text-sm">莊 <span className="text-white">{roadmapData.filter(r => r.bankerPair).length}</span></span>
                  <span className="text-blue-500 font-bold text-sm">閒對 <span className="text-white">{roadmapData.filter(r => r.playerPair).length}</span></span>
                  <span className="text-gray-400 text-sm">總數 <span className="text-white">{total}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Hidden on mobile/tablet */}
        <div className="hidden xl:flex w-64 bg-[#141922] border-l border-gray-800/50 flex-col shrink-0">
          {/* Dealer Info */}
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">花花</div>
                <div className="text-xs text-gray-400">@129 Round {roundNumber}</div>
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
              <span className="text-xs text-gray-500 flex items-center gap-0.5"><User className="w-3 h-3" /> 958</span>
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
              <span className="text-blue-400 font-bold">PLAYER</span>
              <span className="text-red-400 font-bold">BANKER</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{playerWins} / {total}</span>
                <span className="text-gray-400">{bankerWins} / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>TIE</span>
                <span>{ties} / {total}</span>
                <span>SUPER 6</span>
                <span>{super6Count} / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>P. PAIR</span>
                <span>{playerPairCount} / {total}</span>
                <span>B. PAIR</span>
                <span>{bankerPairCount} / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Small</span>
                <span>{smallCount} / {total}</span>
                <span>Big</span>
                <span>{bigCount} / {total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>P. BONUS</span>
                <span>{pBonusCount} / {total}</span>
                <span>B. BONUS</span>
                <span>{bBonusCount} / {total}</span>
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
        dealerName="花花"
        balance={balance}
      />
      <ResultsProportionModal isOpen={isProportionOpen} onClose={() => setIsProportionOpen(false)} />
      <ChipSettingsModal isOpen={isChipSettingsOpen} onClose={() => setIsChipSettingsOpen(false)} />

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
                <div className="font-bold text-sm mb-1">{t('betSuccess') || '下注成功'}</div>
                <div className="text-xs space-y-0.5">
                  {betNotification.bets.map((bet, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span>{betTypeLabels[bet.type] || bet.type}</span>
                      <span className="font-bold">¥{bet.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 pt-1 border-t border-white/20 text-xs font-bold flex justify-between">
                  <span>{t('total') || '总计'}</span>
                  <span>¥{betNotification.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar
        className="xl:hidden"
        variant="game"
        balance={balance}
        totalBet={totalBet}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onClear={clearPendingBets}
        canBet={canBet}
        hasBets={pendingBets.length > 0}
      />
    </div>
  );
}
