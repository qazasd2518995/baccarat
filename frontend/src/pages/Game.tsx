import { useState, useEffect, useRef, useCallback } from 'react';
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
import AnimatedPlayingCard from '../components/game/AnimatedPlayingCard';
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

// Build Ask Road predictions: simulate appending a hypothetical result, then compute derived roads
function buildAskRoad(
  roadmapData: Array<{ result: GameResult; playerPair?: boolean; bankerPair?: boolean }>,
  hypotheticalResult: 'banker' | 'player'
): { bigEye: ('red' | 'blue')[]; smallRoad: ('red' | 'blue')[]; cockroach: ('red' | 'blue')[] } {
  // Append hypothetical result to the data
  const simulatedData = [...roadmapData, { result: hypotheticalResult, playerPair: false, bankerPair: false }];
  const simulatedGrid = buildBigRoad(simulatedData);

  return {
    bigEye: calculateBigEyeBoy(simulatedGrid),
    smallRoad: calculateSmallRoad(simulatedGrid),
    cockroach: calculateCockroachPig(simulatedGrid),
  };
}

// Big Road Cell (大路) - Standard baccarat big road display
// Perfect circles: Red = Banker, Blue = Player
// Tie count shown as green line or number
// Pairs shown as dots: top-left red = banker pair, bottom-right blue = player pair
function BigRoadCell({ result, tieCount = 0, bankerPair, playerPair, blink }: { result?: 'player' | 'banker'; tieCount?: number; bankerPair?: boolean; playerPair?: boolean; blink?: boolean }) {
  if (!result) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors = {
    banker: { border: '#DC2626' },  // Red for Banker
    player: { border: '#2563EB' },  // Blue for Player
  };
  const color = colors[result];

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white" style={{ minWidth: 0, minHeight: 0 }}>
      {/* Main circle - responsive size, hollow */}
      <div
        className="rounded-full"
        style={{ width: '80%', height: '80%', maxWidth: 20, maxHeight: 20, border: `2px solid ${color.border}`, ...(blink ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {}) }}
      />

      {/* Banker pair indicator - red dot at top-left */}
      {bankerPair && (
        <div
          className="absolute top-0 left-0 w-1 h-1 rounded-full"
          style={{ backgroundColor: '#DC2626' }}
        />
      )}

      {/* Player pair indicator - blue dot at bottom-right */}
      {playerPair && (
        <div
          className="absolute bottom-0 right-0 w-1 h-1 rounded-full"
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
            className="absolute inset-0 flex items-center justify-center text-[6px] font-bold"
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
function DerivedRoadCell({ value, type, blink }: { value?: 'red' | 'blue'; type: 'big_eye' | 'small' | 'cockroach'; blink?: boolean }) {
  if (!value) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors = {
    red: { border: '#DC2626', fill: '#DC2626' },
    blue: { border: '#2563EB', fill: '#2563EB' },
  };
  const color = colors[value];

  const blinkStyle = blink ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};

  // Big Eye Boy: hollow circles (border only)
  if (type === 'big_eye') {
    return (
      <div className="w-full h-full flex items-center justify-center p-px bg-white">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ border: `1.5px solid ${color.border}`, ...blinkStyle }}
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
          style={{ backgroundColor: color.fill, ...blinkStyle }}
        />
      </div>
    );
  }

  // Cockroach Pig: diagonal slashes
  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <svg viewBox="0 0 10 10" className="w-3 h-3" style={blinkStyle}>
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

// Big Road grid type
type BigRoadGrid = ({ result: 'player' | 'banker'; tieCount: number; bankerPair: boolean; playerPair: boolean } | null)[][];

// Helper: get column length from big road grid
function getColumnLength(bigRoadGrid: BigRoadGrid, col: number): number {
  let length = 0;
  for (let row = 0; row < 6; row++) {
    if (bigRoadGrid[row]?.[col]) length++;
  }
  return length;
}

// Helper: find max column with data
function getMaxCol(bigRoadGrid: BigRoadGrid): number {
  let maxCol = 0;
  const cols = bigRoadGrid[0]?.length || 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 6; row++) {
      if (bigRoadGrid[row]?.[col]) { maxCol = col; break; }
    }
  }
  return maxCol;
}

// Calculate derived road (generic): compare each column with column - offset
function calculateDerivedRoad(bigRoadGrid: BigRoadGrid, offset: number): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const maxCol = getMaxCol(bigRoadGrid);

  for (let col = offset; col <= maxCol; col++) {
    const currLen = getColumnLength(bigRoadGrid, col);
    const compareLen = getColumnLength(bigRoadGrid, col - offset);

    if (currLen > 1) {
      for (let entry = 1; entry < currLen; entry++) {
        const compareHasEntry = entry < compareLen;
        results.push(compareHasEntry ? 'red' : 'blue');
      }
    }
  }

  return results;
}

// Calculate Big Eye Boy road (compare with column - 1)
function calculateBigEyeBoy(bigRoadGrid: BigRoadGrid): ('red' | 'blue')[] {
  return calculateDerivedRoad(bigRoadGrid, 1);
}

// Calculate Small Road (compare with column - 2)
function calculateSmallRoad(bigRoadGrid: BigRoadGrid): ('red' | 'blue')[] {
  return calculateDerivedRoad(bigRoadGrid, 2);
}

// Calculate Cockroach Pig (compare with column - 3)
function calculateCockroachPig(bigRoadGrid: BigRoadGrid): ('red' | 'blue')[] {
  return calculateDerivedRoad(bigRoadGrid, 3);
}

// Build Big Road data structure - unlimited columns, scrolling handled at display time
// Red circles = Banker wins, Blue circles = Player wins
// Green line/number on circle = Tie count after that result
// Red dot top-left = Banker pair, Blue dot bottom-right = Player pair
function buildBigRoad(data: Array<{ result: GameResult; playerPair?: boolean; bankerPair?: boolean }>): BigRoadGrid {
  const ROWS = 6;
  const MAX_COLS = 120; // large enough for any shoe
  const grid: BigRoadGrid =
    Array(ROWS).fill(null).map(() => Array(MAX_COLS).fill(null));

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

    if (col < MAX_COLS && row < ROWS) {
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

// Get a sliding window of the rightmost DISPLAY_COLS columns from a big road grid
// Returns { window, startCol } so caller knows the offset
function getBigRoadWindow(grid: BigRoadGrid, displayCols: number, extraRoom: number = 1): { window: BigRoadGrid; startCol: number } {
  const maxCol = getMaxCol(grid);
  // Leave extraRoom columns on the right for prediction
  const startCol = Math.max(0, maxCol - displayCols + 1 + extraRoom);
  const window: BigRoadGrid = Array(6).fill(null).map(() => Array(displayCols).fill(null));
  for (let row = 0; row < 6; row++) {
    for (let c = 0; c < displayCols; c++) {
      window[row][c] = grid[row]?.[startCol + c] || null;
    }
  }
  return { window, startCol };
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

  // Ask Road mode: 'none' | 'banker' | 'player'
  const [askRoadMode, setAskRoadMode] = useState<'none' | 'banker' | 'player'>('none');

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

  // Card animation: track whether cards arrived via reconnect (skip animation)
  // Normal flow: phase changes to 'dealing' first, then cards arrive individually
  // Reconnect flow: game:state sends phase + cards together → cards appear when phase is already dealing/result
  // Strategy: when phase changes to 'dealing', mark that we expect cards with animation.
  //           If cards appear without a recent phase transition to 'dealing', it's a reconnect.
  const [skipCardAnim, setSkipCardAnim] = useState(false);
  const [pointsPulseKey, setPointsPulseKey] = useState(0);
  const shoeRef = useRef<HTMLDivElement>(null);
  const cardAreaRef = useRef<HTMLDivElement>(null);
  const expectingCardsRef = useRef(false);

  // Displayed points — only update when card flip animation completes (not on socket event)
  const [displayPlayerPoints, setDisplayPlayerPoints] = useState<number | null>(null);
  const [displayBankerPoints, setDisplayBankerPoints] = useState<number | null>(null);
  // Track how many cards have finished flipping for result timing
  const [allFlipsDone, setAllFlipsDone] = useState(false);
  const flippedCountRef = useRef(0);
  const expectedCardsRef = useRef(0);

  // When phase changes to dealing, mark that we expect animated cards
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'dealing' && prevPhaseRef.current !== 'dealing') {
      // Phase just transitioned to dealing — normal flow, expect animated cards
      expectingCardsRef.current = true;
    }
    if (phase === 'betting') {
      // New round reset
      expectingCardsRef.current = false;
      setSkipCardAnim(false);
      setDisplayPlayerPoints(null);
      setDisplayBankerPoints(null);
      setAllFlipsDone(false);
      flippedCountRef.current = 0;
      expectedCardsRef.current = 0;
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // When cards appear, decide whether to animate
  const prevPlayerCardsLenRef = useRef(playerCards.length);
  useEffect(() => {
    if (playerCards.length > 0 && prevPlayerCardsLenRef.current === 0) {
      if (expectingCardsRef.current) {
        // Normal dealing flow — animate
        setSkipCardAnim(false);
      } else {
        // Cards appeared without a phase transition to dealing — reconnect/state restore
        setSkipCardAnim(true);
        // Show points immediately on reconnect
        setDisplayPlayerPoints(playerPoints);
        setDisplayBankerPoints(bankerPoints);
        setAllFlipsDone(true);
      }
    }
    if (playerCards.length === 0) {
      setSkipCardAnim(false);
    }
    prevPlayerCardsLenRef.current = playerCards.length;
  }, [playerCards.length]);

  // Track total expected cards (player + banker) for flip completion
  useEffect(() => {
    expectedCardsRef.current = playerCards.length + bankerCards.length;
  }, [playerCards.length, bankerCards.length]);

  // Callback when a player card flip completes
  const onPlayerCardFlipped = useCallback((cardIndex: number) => {
    // Calculate points for cards revealed so far (up to cardIndex+1)
    const revealedCards = playerCards.slice(0, cardIndex + 1);
    const pts = revealedCards.reduce((sum, c) => sum + c.value, 0) % 10;
    setDisplayPlayerPoints(pts);
    setPointsPulseKey(k => k + 1);
    flippedCountRef.current += 1;
    if (flippedCountRef.current >= expectedCardsRef.current) {
      setAllFlipsDone(true);
    }
  }, [playerCards]);

  // Callback when a banker card flip completes
  const onBankerCardFlipped = useCallback((cardIndex: number) => {
    const revealedCards = bankerCards.slice(0, cardIndex + 1);
    const pts = revealedCards.reduce((sum, c) => sum + c.value, 0) % 10;
    setDisplayBankerPoints(pts);
    setPointsPulseKey(k => k + 1);
    flippedCountRef.current += 1;
    if (flippedCountRef.current >= expectedCardsRef.current) {
      setAllFlipsDone(true);
    }
  }, [bankerCards]);

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

  // Build full logical Big Road (unlimited columns) and derived roads
  const bigRoadFull = buildBigRoad(roadmapData);

  // Calculate derived roads from full grid
  const bigEyeBoyDataFull = calculateBigEyeBoy(bigRoadFull);
  const smallRoadDataFull = calculateSmallRoad(bigRoadFull);
  const cockroachDataFull = calculateCockroachPig(bigRoadFull);

  // Display constants
  const BIG_ROAD_DISPLAY_COLS = 20;
  const DERIVED_DISPLAY_CELLS = 32; // 8 cols x 4 rows

  // Calculate Ask Roads (問路) - predict what happens if next result is banker/player
  const bankerAskRoad = buildAskRoad(roadmapData, 'banker');
  const playerAskRoad = buildAskRoad(roadmapData, 'player');

  // Find predicted Big Road position on the FULL grid (not windowed)
  const getAskRoadBigRoadPredictionFull = (hypothetical: 'banker' | 'player'): { row: number; col: number; result: 'banker' | 'player' } | null => {
    const simData = [...roadmapData, { result: hypothetical as GameResult, playerPair: false, bankerPair: false }];
    const simGrid = buildBigRoad(simData);
    const simMaxCol = getMaxCol(simGrid);
    const curMaxCol = getMaxCol(bigRoadFull);
    // Find the NEW cell: scan from curMaxCol to simMaxCol
    for (let col = Math.max(0, curMaxCol); col <= simMaxCol; col++) {
      for (let row = 0; row < 6; row++) {
        if (simGrid[row]?.[col] && !bigRoadFull[row]?.[col]) {
          return { row, col, result: hypothetical };
        }
      }
    }
    return null;
  };

  const askPredFull = askRoadMode !== 'none'
    ? getAskRoadBigRoadPredictionFull(askRoadMode)
    : null;

  // Sliding window: make sure predicted cell is visible if ask mode active
  const { window: bigRoadWindow, startCol: bigRoadStartCol } = (() => {
    if (askPredFull) {
      // Ensure the prediction column is visible in the window
      const predCol = askPredFull.col;
      const maxCol = Math.max(getMaxCol(bigRoadFull), predCol);
      const startCol = Math.max(0, maxCol - BIG_ROAD_DISPLAY_COLS + 1);
      const win: BigRoadGrid = Array(6).fill(null).map(() => Array(BIG_ROAD_DISPLAY_COLS).fill(null));
      for (let row = 0; row < 6; row++) {
        for (let c = 0; c < BIG_ROAD_DISPLAY_COLS; c++) {
          win[row][c] = bigRoadFull[row]?.[startCol + c] || null;
        }
      }
      return { window: win, startCol };
    }
    return getBigRoadWindow(bigRoadFull, BIG_ROAD_DISPLAY_COLS);
  })();

  // Convert predicted full-grid position to window position
  const askBigRoadPrediction = (() => {
    if (!askPredFull) return null;
    const displayCol = askPredFull.col - bigRoadStartCol;
    if (displayCol < 0 || displayCol >= BIG_ROAD_DISPLAY_COLS) return null;
    return { row: askPredFull.row, col: displayCol, result: askPredFull.result };
  })();

  // Sliding window for derived roads: show last N entries, leave 1 slot for prediction
  const bigEyeBoyData = bigEyeBoyDataFull.slice(-(DERIVED_DISPLAY_CELLS - 1));
  const smallRoadData = smallRoadDataFull.slice(-(DERIVED_DISPLAY_CELLS - 1));
  const cockroachPigData = cockroachDataFull.slice(-(DERIVED_DISPLAY_CELLS - 1));

  // Get active ask road derived predictions
  const activeAskRoad = (() => {
    if (askRoadMode === 'none') return null;
    const askData = askRoadMode === 'banker' ? bankerAskRoad : playerAskRoad;
    // Compute how many NEW entries the prediction adds beyond current full data
    const newBigEye = askData.bigEye.slice(bigEyeBoyDataFull.length);
    const newSmall = askData.smallRoad.slice(smallRoadDataFull.length);
    const newCockroach = askData.cockroach.slice(cockroachDataFull.length);
    return { bigEye: newBigEye, smallRoad: newSmall, cockroach: newCockroach };
  })();

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

  // Show result only after ALL card flips complete
  const showResult = phase === 'result' && lastResult !== null && allFlipsDone;

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
          <div className="flex-1 relative bg-gradient-to-b from-[#0c1a12] via-[#0a1610] to-[#07120d] overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#d4af37]/3 rounded-full blur-[120px]" />
            </div>

            {/* Integrated Electronic Dealing Table — fills entire game area */}
            <div className="absolute inset-0 flex flex-col">
              {/* Table felt background — full area */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/90 via-[#0a2015]/95 to-[#071a10]/90 overflow-hidden">
                {/* Subtle radial glow */}
                <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-[#d4af37]/4 via-transparent to-transparent" />
                {/* Felt texture overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
                {/* Gold border — inner frame */}
                <div className="absolute inset-2 sm:inset-3 rounded-xl border border-[#d4af37]/15" />
                <div className="absolute inset-4 sm:inset-5 rounded-lg border border-[#d4af37]/8" />
                {/* Corner ornaments */}
                <div className="absolute top-4 left-4 sm:top-5 sm:left-5 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]/25 rounded-tl" />
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]/25 rounded-tr" />
                <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]/25 rounded-bl" />
                <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]/25 rounded-br" />
              </div>

              {/* Top info bar — integrated into table */}
              <div className="relative z-10 flex items-center justify-center pt-3 pb-1">
                <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-1 border border-[#d4af37]/10">
                  <span className="text-[11px] text-[#d4af37]/70 font-mono">{t('baccarat')} {shoeNumber}</span>
                  <span className="text-[#d4af37]/20">|</span>
                  <span className={`text-[11px] font-bold ${phaseDisplay.color}`}>{roundNumber} — {phaseDisplay.text}</span>
                </div>
              </div>

              {/* Main dealing area — fills remaining space */}
              <div className="flex-1 relative flex items-center justify-center">
                {/* Card Shoe — fly-from origin, top center */}
                <div ref={shoeRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-end gap-1">
                    {/* Shoe stack — bigger */}
                    <div className="relative" style={{ width: 48, height: 64 }}>
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="absolute rounded bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] border border-[#d4af37]/30"
                          style={{
                            width: 44, height: 60,
                            top: -i * 2, left: i * 1.5,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                          }}
                        />
                      ))}
                      {/* Gold diamond on top card */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="w-3 h-3 rotate-45 border border-[#d4af37]/50 bg-[#d4af37]/10" />
                      </div>
                    </div>
                    <span className="text-[9px] text-[#d4af37]/40 font-mono tracking-widest mb-1">SHOE</span>
                  </div>
                </div>

                {/* Player & Banker zones */}
                <div ref={cardAreaRef} className="flex items-stretch gap-6 sm:gap-12 lg:gap-20">
                  {/* ——— PLAYER ZONE ——— */}
                  <div className="flex flex-col items-center">
                    {/* Player header + score */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-l text-sm font-bold tracking-wide">
                        P {t('player').toUpperCase()}
                      </div>
                      <div key={`pp-${pointsPulseKey}`} className={`bg-black/60 text-white px-4 py-1 rounded-r text-2xl font-bold min-w-[48px] text-center border border-blue-500/20 ${displayPlayerPoints !== null ? 'points-pulse' : ''}`}>
                        {displayPlayerPoints ?? '-'}
                      </div>
                    </div>
                    {/* Third card — md size */}
                    <div className="h-[70px]">
                      {playerCards.length > 2 && (
                        <div className="mb-1">
                          <AnimatedPlayingCard
                            card={playerCards[2]}
                            size="md"
                            flyFrom={{ x: 0, y: -200 }}
                            flyDelay={3.5}
                            flipDelay={0.5}
                            rotation={90}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onPlayerCardFlipped(2)}
                          />
                        </div>
                      )}
                    </div>
                    {/* First two cards — lg size */}
                    <div className="flex gap-2">
                      {playerCards.length > 0 ? (
                        playerCards.slice(0, 2).map((card, i) => (
                          <AnimatedPlayingCard
                            key={`player-${i}-${card.rank}-${card.suit}`}
                            card={card}
                            size="lg"
                            flyFrom={{ x: 80, y: -250 }}
                            flyDelay={i * 1.2}
                            flipDelay={0.5}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onPlayerCardFlipped(i)}
                          />
                        ))
                      ) : (
                        <>
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown size="lg" />
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown size="lg" />
                        </>
                      )}
                    </div>
                    {/* Card text preview */}
                    <div className="mt-2 flex gap-1.5 text-xs font-mono text-blue-300/60">
                      {playerCards.length > 0 ? playerCards.map((c, i) => (
                        <span key={i} className={c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-red-400/60' : ''}>
                          {SUIT_SYMBOLS[c.suit]}{c.rank}
                        </span>
                      )) : <span className="text-gray-600">--</span>}
                    </div>
                  </div>

                  {/* ——— Center VS ——— */}
                  <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                    <div className="w-px h-14 bg-gradient-to-b from-transparent via-[#d4af37]/25 to-transparent" />
                    <div className="text-base text-[#d4af37]/30 font-bold">VS</div>
                    <div className="w-px h-14 bg-gradient-to-b from-transparent via-[#d4af37]/25 to-transparent" />
                  </div>

                  {/* ——— BANKER ZONE ——— */}
                  <div className="flex flex-col items-center">
                    {/* Banker header + score */}
                    <div className="flex items-center gap-2 mb-4">
                      <div key={`bp-${pointsPulseKey}`} className={`bg-black/60 text-white px-4 py-1 rounded-l text-2xl font-bold min-w-[48px] text-center border border-red-500/20 ${displayBankerPoints !== null ? 'points-pulse' : ''}`}>
                        {displayBankerPoints ?? '-'}
                      </div>
                      <div className="bg-red-600 text-white px-3 py-1 rounded-r text-sm font-bold tracking-wide">
                        {t('banker').toUpperCase()} B
                      </div>
                    </div>
                    {/* Third card — md size */}
                    <div className="h-[70px]">
                      {bankerCards.length > 2 && (
                        <div className="mb-1">
                          <AnimatedPlayingCard
                            card={bankerCards[2]}
                            size="md"
                            flyFrom={{ x: 0, y: -200 }}
                            flyDelay={4.5}
                            flipDelay={0.5}
                            rotation={90}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onBankerCardFlipped(2)}
                          />
                        </div>
                      )}
                    </div>
                    {/* First two cards — lg size */}
                    <div className="flex gap-2">
                      {bankerCards.length > 0 ? (
                        bankerCards.slice(0, 2).map((card, i) => (
                          <AnimatedPlayingCard
                            key={`banker-${i}-${card.rank}-${card.suit}`}
                            card={card}
                            size="lg"
                            flyFrom={{ x: -80, y: -250 }}
                            flyDelay={0.6 + i * 1.2}
                            flipDelay={0.5}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onBankerCardFlipped(i)}
                          />
                        ))
                      ) : (
                        <>
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown size="lg" />
                          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown size="lg" />
                        </>
                      )}
                    </div>
                    {/* Card text preview */}
                    <div className="mt-2 flex gap-1.5 text-xs font-mono text-red-300/60">
                      {bankerCards.length > 0 ? bankerCards.map((c, i) => (
                        <span key={i} className={c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-red-400/60' : ''}>
                          {SUIT_SYMBOLS[c.suit]}{c.rank}
                        </span>
                      )) : <span className="text-gray-600">--</span>}
                    </div>
                  </div>
                </div>

                {/* Result Overlay — delayed to allow animations to finish */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 rounded-xl"
                    >
                      <div className="text-center">
                        <div className={`text-3xl sm:text-4xl font-bold mb-2 drop-shadow-lg ${
                          lastResult === 'player' ? 'text-blue-400' :
                          lastResult === 'banker' ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {lastResult === 'player' ? t('playerWins') :
                           lastResult === 'banker' ? t('bankerWins') : t('tieResult')}
                        </div>
                        {lastSettlement && netResult !== 0 && (
                          <div className={`text-xl sm:text-2xl font-bold ${netResult > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {netResult > 0 ? '+' : ''}{netResult.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
              {/* Left: Bead Plate (珠盤路) + Ask Road buttons - Hidden on mobile */}
              <div className="hidden lg:flex lg:w-[22%] flex-col">
                <div className="flex flex-1">
                  {/* 莊問路 / 閒問路 buttons on left edge */}
                  <div className="w-8 flex flex-col border-r border-gray-400">
                    {/* 莊問路 button */}
                    <button
                      onClick={() => setAskRoadMode(prev => prev === 'banker' ? 'none' : 'banker')}
                      className={`flex-1 flex flex-col items-center justify-center text-white text-xs font-bold border-b border-gray-400 transition-opacity ${askRoadMode === 'banker' ? 'opacity-100 ring-2 ring-yellow-400 ring-inset' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      <span className="writing-vertical tracking-wider text-[10px]">莊問路</span>
                      <div className="flex gap-0.5 mt-1">
                        {(() => {
                          const be = bankerAskRoad.bigEye.slice(bigEyeBoyDataFull.length);
                          const sr = bankerAskRoad.smallRoad.slice(smallRoadDataFull.length);
                          const cp = bankerAskRoad.cockroach.slice(cockroachDataFull.length);
                          const beC = be.length > 0 ? be[be.length - 1] : null;
                          const srC = sr.length > 0 ? sr[sr.length - 1] : null;
                          const cpC = cp.length > 0 ? cp[cp.length - 1] : null;
                          return (
                            <>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: beC ? (beC === 'red' ? '#FCA5A5' : '#93C5FD') : '#FFFFFF50' }} />
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: srC ? (srC === 'red' ? '#FCA5A5' : '#93C5FD') : '#FFFFFF50' }} />
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cpC ? (cpC === 'red' ? '#FCA5A5' : '#93C5FD') : '#FFFFFF50' }} />
                            </>
                          );
                        })()}
                      </div>
                    </button>
                    {/* 閒問路 button */}
                    <button
                      onClick={() => setAskRoadMode(prev => prev === 'player' ? 'none' : 'player')}
                      className={`flex-1 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity ${askRoadMode === 'player' ? 'opacity-100 ring-2 ring-yellow-400 ring-inset' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: '#2563EB' }}
                    >
                      <span className="writing-vertical tracking-wider text-[10px]">閒問路</span>
                      <div className="flex gap-0.5 mt-1">
                        {(() => {
                          const be = playerAskRoad.bigEye.slice(bigEyeBoyDataFull.length);
                          const sr = playerAskRoad.smallRoad.slice(smallRoadDataFull.length);
                          const cp = playerAskRoad.cockroach.slice(cockroachDataFull.length);
                          const beC = be.length > 0 ? be[be.length - 1] : null;
                          const srC = sr.length > 0 ? sr[sr.length - 1] : null;
                          const cpC = cp.length > 0 ? cp[cp.length - 1] : null;
                          return (
                            <>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: beC ? (beC === 'red' ? '#FCA5A5' : '#93C5FD') : '#FFFFFF50' }} />
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: srC ? (srC === 'red' ? '#FCA5A5' : '#93C5FD') : '#FFFFFF50' }} />
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cpC ? (cpC === 'red' ? '#FCA5A5' : '#93C5FD') : '#FFFFFF50' }} />
                            </>
                          );
                        })()}
                      </div>
                    </button>
                  </div>

                  {/* Bead Plate Grid (珠盤路) — shows history as colored circles with 莊/閒/和 text */}
                  {/* Uses sliding window: show last (ROWS*COLS - 1) rounds + 1 empty slot for prediction */}
                  <div className="flex-1 grid grid-cols-5 grid-rows-6 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {(() => {
                      const ROWS = 6;
                      const COLS = 5;
                      const TOTAL = ROWS * COLS; // 30 cells
                      // Keep 1 slot empty for ask road prediction display
                      const maxShow = TOTAL - 1; // 29
                      const latest = roadmapData.slice(-maxShow);
                      const cells: ({ data: typeof roadmapData[0] | null; predicted?: boolean })[] = Array(TOTAL).fill(null).map(() => ({ data: null }));
                      // Fill column by column
                      for (let i = 0; i < latest.length; i++) {
                        const col = Math.floor(i / ROWS);
                        const row = i % ROWS;
                        cells[row * COLS + col] = { data: latest[i] };
                      }
                      // Add ask road prediction at next position
                      if (askRoadMode !== 'none') {
                        const predIdx = latest.length;
                        if (predIdx < TOTAL) {
                          const predCol = Math.floor(predIdx / ROWS);
                          const predRow = predIdx % ROWS;
                          const cellIdx = predRow * COLS + predCol;
                          if (cellIdx < TOTAL) {
                            cells[cellIdx] = {
                              data: { result: askRoadMode as GameResult, playerPair: false, bankerPair: false, roundNumber: 0, playerPoints: 0, bankerPoints: 0, totalCards: 0 },
                              predicted: true,
                            };
                          }
                        }
                      }
                      return cells.map((cell, i) => {
                        if (!cell.data) return <div key={`bead-${i}`} className="w-full h-full bg-white" />;
                        const round = cell.data;
                        const bgColor = round.result === 'banker' ? '#DC2626' : round.result === 'player' ? '#2563EB' : '#16A34A';
                        const label = round.result === 'banker' ? '莊' : round.result === 'player' ? '閒' : '和';
                        const blinkStyle = cell.predicted ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
                        return (
                          <div key={`bead-${i}`} className="relative w-full h-full flex items-center justify-center bg-white">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: bgColor, fontSize: '10px', ...blinkStyle }}>
                              {label}
                            </div>
                            {!cell.predicted && round.bankerPair && <div className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />}
                            {!cell.predicted && round.playerPair && <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2563EB' }} />}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Bottom Stats bar */}
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
                {/* Big Road - circles with sliding window */}
                <div className="flex-1 p-1" style={{ backgroundColor: '#FFFFFF' }}>
                  <div className="grid grid-rows-6 gap-px h-full" style={{ backgroundColor: '#D1D5DB', gridTemplateColumns: `repeat(${BIG_ROAD_DISPLAY_COLS}, minmax(0, 1fr))` }}>
                    {Array(6).fill(null).flatMap((_, rowIndex) =>
                      Array(BIG_ROAD_DISPLAY_COLS).fill(null).map((_, colIndex) => {
                        const cell = bigRoadWindow[rowIndex]?.[colIndex];
                        const isPredicted = askBigRoadPrediction && askBigRoadPrediction.row === rowIndex && askBigRoadPrediction.col === colIndex;
                        if (isPredicted) {
                          return (
                            <BigRoadCell
                              key={`${rowIndex}-${colIndex}`}
                              result={askBigRoadPrediction.result}
                              blink={true}
                            />
                          );
                        }
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
                      {Array(DERIVED_DISPLAY_CELLS).fill(null).map((_, i) => {
                        // Show predicted entry right after existing data
                        const isPredicted = activeAskRoad && i === bigEyeBoyData.length && i < DERIVED_DISPLAY_CELLS && activeAskRoad.bigEye.length > 0;
                        const predValue = isPredicted ? activeAskRoad.bigEye[0] : undefined;
                        return (
                          <DerivedRoadCell
                            key={`bigEye-${i}`}
                            value={isPredicted ? predValue : bigEyeBoyData[i]}
                            type="big_eye"
                            blink={!!isPredicted}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Small Road - filled circles */}
                  <div className="flex-1 border-r border-gray-400" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(DERIVED_DISPLAY_CELLS).fill(null).map((_, i) => {
                        const isPredicted = activeAskRoad && i === smallRoadData.length && i < DERIVED_DISPLAY_CELLS && activeAskRoad.smallRoad.length > 0;
                        const predValue = isPredicted ? activeAskRoad.smallRoad[0] : undefined;
                        return (
                          <DerivedRoadCell
                            key={`small-${i}`}
                            value={isPredicted ? predValue : smallRoadData[i]}
                            type="small"
                            blink={!!isPredicted}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Cockroach Pig - slashes */}
                  <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(DERIVED_DISPLAY_CELLS).fill(null).map((_, i) => {
                        const isPredicted = activeAskRoad && i === cockroachPigData.length && i < DERIVED_DISPLAY_CELLS && activeAskRoad.cockroach.length > 0;
                        const predValue = isPredicted ? activeAskRoad.cockroach[0] : undefined;
                        return (
                          <DerivedRoadCell
                            key={`cockroach-${i}`}
                            value={isPredicted ? predValue : cockroachPigData[i]}
                            type="cockroach"
                            blink={!!isPredicted}
                          />
                        );
                      })}
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
