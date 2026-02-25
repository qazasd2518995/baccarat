import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Music,
  Music2,
  Menu,
  Home,
} from 'lucide-react';
import { useDragonTigerStore, type DragonTigerBetType } from '../store/dragonTigerStore';
import { useGameStore } from '../store/gameStore';
import { useDragonTigerSocket } from '../hooks/useDragonTigerSocket';
import { useAuthStore } from '../store/authStore';
import { useTTS } from '../hooks/useTTS';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import AnimatedPlayingCard from '../components/game/AnimatedPlayingCard';
import ChipSettingsModal from '../components/game/ChipSettingsModal';
import CasinoChip, { formatChipValue } from '../components/game/CasinoChip';
import CountdownTimer from '../components/game/CountdownTimer';
import DealerTable3D from '../components/game/DealerTable3D';
import MarqueeChat, { useMarqueeChat, MarqueeQuickButtons } from '../components/game/MarqueeChat';
import TableChipDisplay from '../components/game/TableChipDisplay';
import DragonTigerRoadmap from '../components/game/DragonTigerRoadmap';
import { FlyingChipOverlay, useFlyingChips, ChipStack } from '../components/game/BetAreaChips';
import {
  GameSettingsModal,
  GameRulesModal,
  GameReportModal,
  FollowingListModal,
  TableSwitchModal,
  GiftModal,
  ResultsProportionModal,
} from '../components/game/modals';

// Chip component - uses CasinoChip SVG
function Chip({ value, selected, onClick, disabled, extraSmall }: { value: number; selected: boolean; onClick: () => void; disabled?: boolean; extraSmall?: boolean }) {
  const size = extraSmall ? 40 : 56;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-full
        shadow-lg transition-all duration-200
        ${selected ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900' : ''}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
      `}
    >
      <CasinoChip size={size} value={value} label={formatChipValue(value)} />
    </button>
  );
}

// Normalize result type: backend uses 'dt_tie', frontend expects 'tie'
function normalizeResult(result: string | undefined): 'dragon' | 'tiger' | 'tie' | undefined {
  if (!result) return undefined;
  if (result === 'dt_tie') return 'tie';
  if (result === 'dragon' || result === 'tiger' || result === 'tie') return result;
  return undefined;
}

// DT Big Road grid type
type DTBigRoadGrid = ({ result: 'dragon' | 'tiger'; tieCount: number } | null)[][];

// Build Big Road data structure for Dragon Tiger — 120 cols for sliding window
function buildDTBigRoad(data: Array<{ result: string }>): DTBigRoadGrid {
  const ROWS = 6;
  const MAX_COLS = 120;
  const grid: DTBigRoadGrid =
    Array(ROWS).fill(null).map(() => Array(MAX_COLS).fill(null));

  if (data.length === 0) return grid;

  let col = 0;
  let row = 0;
  let lastResult: 'dragon' | 'tiger' | null = null;
  let tieCount = 0;

  for (const round of data) {
    const result = normalizeResult(round.result);

    if (result === 'tie') {
      tieCount++;
      continue;
    }

    if (!result) continue;

    if (lastResult === null || result !== lastResult) {
      if (lastResult !== null) {
        col++;
        row = 0;
      }
      lastResult = result;
    } else {
      row++;
      if (row >= ROWS) {
        row = ROWS - 1;
        col++;
      }
    }

    if (col < MAX_COLS && row < ROWS) {
      grid[row][col] = {
        result: result,
        tieCount,
      };
      tieCount = 0;
    }
  }

  return grid;
}

// Helper: get column length from DT big road grid
function getDTColumnLength(grid: DTBigRoadGrid, col: number): number {
  let length = 0;
  for (let row = 0; row < 6; row++) {
    if (grid[row]?.[col]) length++;
  }
  return length;
}

// Helper: find max column with data
function getDTMaxCol(grid: DTBigRoadGrid): number {
  let maxCol = 0;
  const cols = grid[0]?.length || 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 6; row++) {
      if (grid[row]?.[col]) { maxCol = col; break; }
    }
  }
  return maxCol;
}

// Calculate derived road (generic): compare each column with column - offset (flat array)
function calculateDTDerivedRoad(grid: DTBigRoadGrid, offset: number): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const maxCol = getDTMaxCol(grid);

  for (let col = offset; col <= maxCol; col++) {
    const currLen = getDTColumnLength(grid, col);
    const compareLen = getDTColumnLength(grid, col - offset);

    if (currLen > 1) {
      for (let entry = 1; entry < currLen; entry++) {
        const compareHasEntry = entry < compareLen;
        results.push(compareHasEntry ? 'red' : 'blue');
      }
    }
  }

  return results;
}

function calculateDTBigEyeBoy(grid: DTBigRoadGrid): ('red' | 'blue')[] {
  return calculateDTDerivedRoad(grid, 1);
}

function calculateDTSmallRoad(grid: DTBigRoadGrid): ('red' | 'blue')[] {
  return calculateDTDerivedRoad(grid, 2);
}

function calculateDTCockroachPig(grid: DTBigRoadGrid): ('red' | 'blue')[] {
  return calculateDTDerivedRoad(grid, 3);
}

// Build Ask Road predictions: simulate appending a hypothetical result, then compute derived roads
function buildDTAskRoad(
  roadmapData: Array<{ result: string }>,
  hypotheticalResult: 'dragon' | 'tiger'
): { bigEye: ('red' | 'blue')[]; smallRoad: ('red' | 'blue')[]; cockroach: ('red' | 'blue')[] } {
  const simulatedData = [...roadmapData, { result: hypotheticalResult }];
  const simulatedGrid = buildDTBigRoad(simulatedData);

  return {
    bigEye: calculateDTBigEyeBoy(simulatedGrid),
    smallRoad: calculateDTSmallRoad(simulatedGrid),
    cockroach: calculateDTCockroachPig(simulatedGrid),
  };
}

// Big Road Cell for Dragon Tiger (龍=紅, 虎=藍, 和=綠線)
function DTBigRoadCell({ result, tieCount = 0, blink }: { result?: 'dragon' | 'tiger'; tieCount?: number; blink?: boolean }) {
  if (!result) {
    return <div className="w-full h-full bg-white" />;
  }

  const colors = {
    dragon: { border: '#DC2626' },  // Red for Dragon
    tiger: { border: '#2563EB' },   // Blue for Tiger
  };
  const color = colors[result];

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white" style={{ minWidth: 0, minHeight: 0 }}>
      {/* Main circle - responsive size, hollow */}
      <div
        className="rounded-full"
        style={{
          width: '80%',
          height: '80%',
          maxWidth: 20,
          maxHeight: 20,
          border: `2px solid ${color.border}`,
          ...(blink ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {})
        }}
      />

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

// Derived Road Cell for Dragon Tiger (大眼仔, 小路, 蟑螂路)
function DTDerivedRoadCell({ value, type, blink }: { value?: 'red' | 'blue'; type: 'big_eye' | 'small' | 'cockroach'; blink?: boolean }) {
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

// Get sliding window for Big Road display
function getDTBigRoadWindow(grid: DTBigRoadGrid, displayCols: number, extraRoom: number = 1): { window: DTBigRoadGrid; startCol: number } {
  const maxCol = getDTMaxCol(grid);
  const startCol = Math.max(0, maxCol - displayCols + 1 + extraRoom);
  const window: DTBigRoadGrid = Array(6).fill(null).map(() => Array(displayCols).fill(null));

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < displayCols; col++) {
      const srcCol = startCol + col;
      if (srcCol >= 0 && srcCol < grid[0]?.length) {
        window[row][col] = grid[row][srcCol];
      }
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

export default function DragonTigerGame() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Get tableId from URL query params
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table') || undefined;

  const { submitBets, cancelBets } = useDragonTigerSocket(tableId);

  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [isTableSwitchOpen, setIsTableSwitchOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isProportionOpen, setIsProportionOpen] = useState(false);
  const [isChipSettingsOpen, setIsChipSettingsOpen] = useState(false);

  // Mobile hamburger menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Ask Road mode: 'none' | 'dragon' | 'tiger'
  const [askRoadMode, setAskRoadMode] = useState<'none' | 'dragon' | 'tiger'>('none');

  // Flying chips animation
  const { flyingChips, addFlyingChip } = useFlyingChips();
  const chipSelectorRef = useRef<HTMLDivElement>(null);

  // Marquee chat
  const { cooldown: marqueeCooldown, sendMessage: sendMarqueeMessage } = useMarqueeChat(user?.username || '玩家');

  // Get displayed chips from gameStore (shared with Baccarat)
  const { displayedChips } = useGameStore();

  // UI states
  const [isMuted, setIsMuted] = useState(false);
  const { play: playSound } = useTTS(isMuted);
  const [isBgmOn, setIsBgmOn] = useState(true);
  const { toggleBgm } = useBackgroundMusic(isMuted);
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
    getBetChipValue,
    dragonCard,
    tigerCard,
    dragonValue,
    tigerValue,
    dragonFlipped,
    tigerFlipped,
    setDragonFlipped,
    setTigerFlipped,
    lastResult,
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
    fakeBets,
  } = useDragonTigerStore();

  // Cumulative win/loss for this session
  const [sessionWinLoss, setSessionWinLoss] = useState(0);
  const prevSettlementRef = useRef<typeof lastSettlement>(null);

  // Card animation: track reconnection to skip animation
  // Normal flow: phase → dealing first, then cards arrive individually
  // Reconnect: dt:state sends phase + cards together
  const [skipCardAnim, setSkipCardAnim] = useState(false);
  const [vsPulse, setVsPulse] = useState(false);
  const expectingDTCardsRef = useRef(false);

  // Accumulate session win/loss when a new settlement arrives
  useEffect(() => {
    if (lastSettlement && lastSettlement !== prevSettlementRef.current) {
      setSessionWinLoss(prev => prev + lastSettlement.netResult);
      prevSettlementRef.current = lastSettlement;
    }
  }, [lastSettlement]);

  // Track phase transitions
  const prevDTPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'dealing' && prevDTPhaseRef.current !== 'dealing') {
      expectingDTCardsRef.current = true;
    }
    // TTS: 請下注
    if (phase === 'betting' && prevDTPhaseRef.current !== 'betting') {
      playSound('placeBets');
      expectingDTCardsRef.current = false;
      setSkipCardAnim(false);
      setVsPulse(false);
    } else if (phase === 'betting') {
      expectingDTCardsRef.current = false;
      setSkipCardAnim(false);
      setVsPulse(false);
    }
    // TTS: 停止下注
    if (phase === 'sealed' && prevDTPhaseRef.current !== 'sealed') {
      playSound('stopBets');
    }
    // Result sound is handled in the delayed result display effect
    prevDTPhaseRef.current = phase;
  }, [phase, playSound]);

  // When cards appear, decide whether to animate
  const prevDragonCardRef = useRef(dragonCard);
  useEffect(() => {
    if (dragonCard && !prevDragonCardRef.current) {
      if (expectingDTCardsRef.current) {
        // Normal dealing — animate
        setSkipCardAnim(false);
      } else {
        // Reconnect — skip animation
        setSkipCardAnim(true);
        setDragonFlipped(true);
        if (tigerCard) setTigerFlipped(true);
      }
    }
    if (!dragonCard) {
      setSkipCardAnim(false);
      setVsPulse(false);
    }
    prevDragonCardRef.current = dragonCard;
  }, [dragonCard, tigerCard, setDragonFlipped, setTigerFlipped]);

  // Trigger VS pulse when both cards are flipped
  useEffect(() => {
    if (dragonFlipped && tigerFlipped && !skipCardAnim) {
      setVsPulse(true);
    }
  }, [dragonFlipped, tigerFlipped, skipCardAnim]);

  // Bet success notification
  const [betNotification, setBetNotification] = useState<{
    show: boolean;
    bets: Array<{ type: string; amount: number }>;
    total: number;
  }>({ show: false, bets: [], total: 0 });

  const prevConfirmedBetsRef = useRef<number>(0);
  const betNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentCount = confirmedBets.length;
    const prevCount = prevConfirmedBetsRef.current;

    if (currentCount > 0 && currentCount > prevCount && phase === 'betting') {
      playSound('betSuccessVoice');
      const total = confirmedBets.reduce((sum, b) => sum + b.amount, 0);
      setBetNotification({
        show: true,
        bets: confirmedBets.map(b => ({ type: b.type, amount: b.amount })),
        total,
      });

      if (betNotifTimerRef.current) clearTimeout(betNotifTimerRef.current);
      betNotifTimerRef.current = setTimeout(() => {
        setBetNotification(prev => ({ ...prev, show: false }));
        betNotifTimerRef.current = null;
      }, 3000);
    }

    prevConfirmedBetsRef.current = currentCount;
  }, [confirmedBets, phase, playSound]);

  useEffect(() => {
    prevConfirmedBetsRef.current = 0;
  }, [roundNumber]);

  const canBet = phase === 'betting' && isConnected;
  const hasPendingBets = pendingBets.length > 0;
  const hasConfirmedBets = confirmedBets.length > 0;

  const handleBet = (type: DragonTigerBetType, event?: React.MouseEvent) => {
    if (!canBet) return;
    const success = addPendingBet(type);
    if (success) {
      playSound('chipPlace');

      // Trigger flying chip animation
      if (event && chipSelectorRef.current) {
        const selectorRect = chipSelectorRef.current.getBoundingClientRect();
        const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

        const startX = selectorRect.left + selectorRect.width / 2;
        const startY = selectorRect.top + selectorRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;

        addFlyingChip(selectedChip, startX, startY, endX, endY);
      }
    }
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

  // Stats from roadmap (normalize dt_tie to tie)
  const dragonWins = roadmapData.filter(r => normalizeResult(r.result) === 'dragon').length;
  const tigerWins = roadmapData.filter(r => normalizeResult(r.result) === 'tiger').length;
  const ties = roadmapData.filter(r => normalizeResult(r.result) === 'tie').length;
  const total = roadmapData.length;

  // Build big road grid (full 120 cols)
  const bigRoadFull = buildDTBigRoad(roadmapData);

  // Build derived roads data for Ask Road feature
  const bigEyeBoyDataFull = calculateDTBigEyeBoy(bigRoadFull);
  const smallRoadDataFull = calculateDTSmallRoad(bigRoadFull);
  const cockroachDataFull = calculateDTCockroachPig(bigRoadFull);

  // Calculate Ask Roads (問路) - predict what happens if next result is dragon/tiger
  const dragonAskRoad = buildDTAskRoad(roadmapData, 'dragon');
  const tigerAskRoad = buildDTAskRoad(roadmapData, 'tiger');

  // Display constants for right side roads
  const BIG_ROAD_DISPLAY_COLS = 12;
  const DERIVED_DISPLAY_CELLS = 32; // 8 cols × 4 rows

  // Get the big road window with sliding
  const getAskRoadBigRoadPredictionFull = (hypothetical: 'dragon' | 'tiger'): { row: number; col: number; result: 'dragon' | 'tiger' } | null => {
    const simData = [...roadmapData, { result: hypothetical }];
    const simGrid = buildDTBigRoad(simData);
    const maxCol = getDTMaxCol(simGrid);
    for (let row = 5; row >= 0; row--) {
      if (simGrid[row]?.[maxCol]) {
        return { row, col: maxCol, result: hypothetical };
      }
    }
    return null;
  };

  const askBigRoadPredictionFull = askRoadMode !== 'none'
    ? getAskRoadBigRoadPredictionFull(askRoadMode)
    : null;

  // Build window — if ask road active, include prediction column in window
  const { window: bigRoadWindow } = (() => {
    if (askRoadMode !== 'none' && askBigRoadPredictionFull) {
      const simData = [...roadmapData, { result: askRoadMode }];
      const simGrid = buildDTBigRoad(simData);
      const win: DTBigRoadGrid = Array(6).fill(null).map(() => Array(BIG_ROAD_DISPLAY_COLS).fill(null));
      const { startCol } = getDTBigRoadWindow(simGrid, BIG_ROAD_DISPLAY_COLS, 0);
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < BIG_ROAD_DISPLAY_COLS; col++) {
          const srcCol = startCol + col;
          if (srcCol >= 0 && srcCol < simGrid[0]?.length) win[row][col] = simGrid[row][srcCol];
        }
      }
      return { window: win };
    }
    return getDTBigRoadWindow(bigRoadFull, BIG_ROAD_DISPLAY_COLS);
  })();

  const askBigRoadPrediction = (() => {
    if (!askBigRoadPredictionFull) return null;
    const { startCol } = getDTBigRoadWindow(bigRoadFull, BIG_ROAD_DISPLAY_COLS);
    const mappedCol = askBigRoadPredictionFull.col - startCol;
    if (mappedCol < 0 || mappedCol >= BIG_ROAD_DISPLAY_COLS) return null;
    return { ...askBigRoadPredictionFull, col: mappedCol };
  })();

  // Derived roads data for display (sliding window)
  const bigEyeBoyData = bigEyeBoyDataFull.slice(-(DERIVED_DISPLAY_CELLS - 1));
  const smallRoadData = smallRoadDataFull.slice(-(DERIVED_DISPLAY_CELLS - 1));
  const cockroachPigData = cockroachDataFull.slice(-(DERIVED_DISPLAY_CELLS - 1));

  // Active ask road predictions for derived roads
  const activeAskRoad = (() => {
    if (askRoadMode === 'none') return null;
    const askData = askRoadMode === 'dragon' ? dragonAskRoad : tigerAskRoad;
    const newBigEye = askData.bigEye.slice(bigEyeBoyDataFull.length);
    const newSmall = askData.smallRoad.slice(smallRoadDataFull.length);
    const newCockroach = askData.cockroach.slice(cockroachDataFull.length);
    return { bigEye: newBigEye, smallRoad: newSmall, cockroach: newCockroach };
  })();

  // Phase display
  const phaseDisplay = getPhaseDisplay(phase, timeRemaining, t);

  // Net result from last settlement
  const netResult = lastSettlement?.netResult || 0;

  // Delayed result display — wait for both cards flipped + 2s delay
  const [showResult, setShowResult] = useState(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Both cards flipped AND we have a result → start 2s delay
    if (dragonFlipped && tigerFlipped && lastResult && phase === 'result' && !showResult) {
      // Play result sound
      if (lastResult === 'dragon') playSound('dragonWins');
      else if (lastResult === 'tiger') playSound('tigerWins');
      else playSound('dtTie');

      resultTimerRef.current = setTimeout(() => {
        setShowResult(true);
        // Auto-hide after 2.5s
        resultTimerRef.current = setTimeout(() => {
          setShowResult(false);
        }, 2500);
      }, 2000);
    }
    // Reset when new round starts
    if (phase === 'betting') {
      setShowResult(false);
      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current);
        resultTimerRef.current = null;
      }
    }
  }, [dragonFlipped, tigerFlipped, lastResult, phase, showResult, playSound]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  // Bet type labels
  const betTypeLabels: Record<string, string> = {
    dragon: t('dtDragon'),
    tiger: t('dtTiger'),
    dt_tie: t('dtTie'),
    dt_suited_tie: t('dtSuitedTie'),
    dragon_odd: t('dragonOdd'),
    dragon_even: t('dragonEven'),
    tiger_odd: t('tigerOdd'),
    tiger_even: t('tigerEven'),
    dragon_red: t('dragonRed'),
    dragon_black: t('dragonBlack'),
    tiger_red: t('tigerRed'),
    tiger_black: t('tigerBlack'),
    dragon_big: t('dragonBig'),
    dragon_small: t('dragonSmall'),
    tiger_big: t('tigerBig'),
    tiger_small: t('tigerSmall'),
  };

  // Calculate total bet
  const totalBet = pendingBets.reduce((sum, b) => sum + b.amount, 0) +
                   confirmedBets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="h-full bg-[#1a1f2e] text-white flex flex-col overflow-hidden">
      {/* Flying chips overlay */}
      <FlyingChipOverlay chips={flyingChips} chipSize={32} />

      {/* Top Header Bar - Hidden on mobile, shown on lg+ */}
      <header className="hidden lg:flex h-11 bg-[#0d1117] items-center justify-between px-4 border-b border-gray-800/50">
        {/* Left - Back & Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="p-1 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
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
            <span>{isConnected ? t('live') : t('offline')}</span>
          </div>
        </div>

        {/* Right - Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-1 text-gray-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { const on = toggleBgm(); setIsBgmOn(on); }}
            className={`p-1 ${isBgmOn && !isMuted ? 'text-gold' : 'text-gray-400'} hover:text-white`}
            title={isBgmOn ? '關閉背景音樂' : '開啟背景音樂'}
          >
            {isBgmOn && !isMuted ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
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

      {/* Mobile Hamburger Menu Button - Fixed position */}
      <div className="lg:hidden fixed top-2 right-2 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-black/60 rounded-lg text-white"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed top-12 right-2 z-50 bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-xl p-2 min-w-[160px]"
          >
            <div className="flex flex-col gap-1">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-2 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{isConnected ? '已連線' : '離線'}</span>
              </div>
              {/* Balance */}
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 font-bold">
                <Coins className="w-4 h-4" />
                <span>${balance.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-700 my-1" />
              {/* Sound Toggle */}
              <button
                onClick={() => { toggleMute(); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? '開啟音效' : '關閉音效'}</span>
              </button>
              {/* BGM Toggle */}
              <button
                onClick={() => { const on = toggleBgm(); setIsBgmOn(on); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                {isBgmOn && !isMuted ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
                <span>{isBgmOn ? '關閉音樂' : '開啟音樂'}</span>
              </button>
              <div className="border-t border-gray-700 my-1" />
              {/* Settings */}
              <button
                onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <Settings className="w-4 h-4" />
                <span>設定</span>
              </button>
              {/* Rules */}
              <button
                onClick={() => { setIsRulesOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <HelpCircle className="w-4 h-4" />
                <span>遊戲規則</span>
              </button>
              {/* Report */}
              <button
                onClick={() => { setIsReportOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <FileText className="w-4 h-4" />
                <span>報表</span>
              </button>
              {/* Results Proportion */}
              <button
                onClick={() => { setIsProportionOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <BarChart2 className="w-4 h-4" />
                <span>結果比例</span>
              </button>
              <div className="border-t border-gray-700 my-1" />
              {/* Back to Lobby */}
              <button
                onClick={() => navigate('/lobby')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded"
              >
                <Home className="w-4 h-4" />
                <span>返回大廳</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - User Info & Leaderboard (hidden on mobile/tablet) */}
        <div className="hidden xl:flex w-60 bg-[#141922] border-r border-gray-800/50 flex-col shrink-0">
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          {/* Countdown timer — over entire game area */}
          <CountdownTimer timeRemaining={timeRemaining} phase={phase} />

          {/* Video Area - 3D Dealer Table */}
          <DealerTable3D
            isDealing={phase === 'dealing'}
            dealerName={currentDealerName}
            gameType="dragonTiger"
          >
            {/* Round Info - Hidden on mobile, compact on tablet */}
            <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm z-20">
              <span className="text-gray-400">{t('dragonTiger')} {shoeNumber}</span>
              <span className="hidden lg:inline text-white ml-2">{new Date().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`ml-2 font-bold ${phaseDisplay.color}`}>{roundNumber} - {phaseDisplay.text}</span>
            </div>

            {/* Cards Display - Dragon vs Tiger */}
            <div className="flex-1 relative flex items-center justify-center mt-[5%] sm:mt-[10%]">
              <div className="flex items-center gap-4 sm:gap-12 lg:gap-20">
                {/* Dragon Side */}
                <div className="text-center">
                  <div className="text-base sm:text-2xl font-bold text-red-400 mb-2 sm:mb-4">{t('dtDragon')}</div>
                  <div className="relative">
                    {dragonCard && (
                      <AnimatedPlayingCard
                        card={dragonCard}
                        size="md"
                        flyFrom={{ x: 100, y: -250 }}
                        flyDelay={0}
                        flyDuration={0.6}
                        flipDelay={0.5}
                        flipDuration={0.8}
                        glowing={!!lastResult && lastResult === 'dragon'}
                        glowColor="rgba(239, 68, 68, 0.6)"
                        skipAnimation={skipCardAnim}
                        onFlipComplete={() => setDragonFlipped(true)}
                      />
                    )}
                    <AnimatePresence>
                      {dragonValue !== null && dragonFlipped && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-2 sm:px-4 py-0.5 sm:py-1 rounded-full font-bold text-sm sm:text-lg"
                        >
                          {dragonValue}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* VS */}
                <div className={`text-xl sm:text-4xl font-bold text-gray-500 ${vsPulse ? 'vs-flash' : ''}`}>VS</div>

                {/* Tiger Side */}
                <div className="text-center">
                  <div className="text-base sm:text-2xl font-bold text-blue-400 mb-2 sm:mb-4">{t('dtTiger')}</div>
                  <div className="relative">
                    {tigerCard && (
                      <AnimatedPlayingCard
                        card={tigerCard}
                        size="md"
                        flyFrom={{ x: -100, y: -250 }}
                        flyDelay={0.8}
                        flyDuration={0.6}
                        flipDelay={0.5}
                        flipDuration={0.8}
                        glowing={!!lastResult && lastResult === 'tiger'}
                        glowColor="rgba(59, 130, 246, 0.6)"
                        skipAnimation={skipCardAnim}
                        onFlipComplete={() => setTigerFlipped(true)}
                      />
                    )}
                    <AnimatePresence>
                      {tigerValue !== null && tigerFlipped && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-2 sm:px-4 py-0.5 sm:py-1 rounded-full font-bold text-sm sm:text-lg"
                        >
                          {tigerValue}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </div>

            {/* Fake bet chips on table - at bottom of table area */}
            <div className="absolute bottom-[8%] sm:bottom-[10%] left-4 right-4 z-10 pointer-events-none">
              <TableChipDisplay
                targetBets={{
                  player: (fakeBets.dragon || 0) + (fakeBets.dragon_big || 0) + (fakeBets.dragon_small || 0) + (fakeBets.dragon_odd || 0) + (fakeBets.dragon_even || 0) + (fakeBets.dragon_red || 0) + (fakeBets.dragon_black || 0),
                  tie: (fakeBets.dt_tie || 0) + (fakeBets.dt_suited_tie || 0),
                  banker: (fakeBets.tiger || 0) + (fakeBets.tiger_big || 0) + (fakeBets.tiger_small || 0) + (fakeBets.tiger_odd || 0) + (fakeBets.tiger_even || 0) + (fakeBets.tiger_red || 0) + (fakeBets.tiger_black || 0),
                }}
                phase={phase}
                compact={true}
                gameType="dragonTiger"
              />
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="fixed inset-0 flex items-center justify-center z-[60] bg-black/50"
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
          </DealerTable3D>

          {/* Marquee chat - flying messages (outside DealerTable3D for proper positioning) */}
          <MarqueeChat
            username={user?.username || '玩家'}
            showButtons={true}
          />

          {/* Betting Panel */}
          <div className="bg-[#0d1117]">
            {/* Quick Message Buttons - Desktop only, above Control Bar */}
            <div className="hidden xl:flex items-center gap-1 px-4 py-1.5 border-b border-gray-800/30 bg-black/30">
              <span className="text-[10px] text-gray-500 mr-2">廣播:</span>
              <MarqueeQuickButtons sendMessage={sendMarqueeMessage} cooldown={marqueeCooldown} />
            </div>

            {/* Control Bar - Hidden on mobile, shown on xl+ */}
            <div className="hidden xl:flex items-center justify-between px-4 py-2 gap-2 border-b border-gray-800/50">
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
            <div className="flex flex-col lg:flex-row lg:items-stretch lg:h-[360px] xl:pb-0" style={{ backgroundColor: '#FFFFFF' }}>
              {/* Left: Ask Road Buttons + Bead Plate (珠盤路) - Hidden on mobile */}
              <div className="hidden lg:flex lg:w-[22%] flex-col">
                <div className="flex flex-1">
                  {/* 龍問路 / 虎問路 buttons on left edge */}
                  <div className="w-8 flex flex-col border-r border-gray-400">
                    {/* 龍問路 button */}
                    <button
                      onClick={() => setAskRoadMode(prev => prev === 'dragon' ? 'none' : 'dragon')}
                      className={`flex-1 flex flex-col items-center justify-center text-white text-xs font-bold border-b border-gray-400 transition-opacity ${askRoadMode === 'dragon' ? 'opacity-100 ring-2 ring-yellow-400 ring-inset' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      <span className="writing-vertical tracking-wider text-[10px]">{t('dragonAskRoad')}</span>
                      <div className="flex gap-0.5 mt-1">
                        {(() => {
                          const be = dragonAskRoad.bigEye.slice(bigEyeBoyDataFull.length);
                          const sr = dragonAskRoad.smallRoad.slice(smallRoadDataFull.length);
                          const cp = dragonAskRoad.cockroach.slice(cockroachDataFull.length);
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
                    {/* 虎問路 button */}
                    <button
                      onClick={() => setAskRoadMode(prev => prev === 'tiger' ? 'none' : 'tiger')}
                      className={`flex-1 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity ${askRoadMode === 'tiger' ? 'opacity-100 ring-2 ring-yellow-400 ring-inset' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: '#2563EB' }}
                    >
                      <span className="writing-vertical tracking-wider text-[10px]">{t('tigerAskRoad')}</span>
                      <div className="flex gap-0.5 mt-1">
                        {(() => {
                          const be = tigerAskRoad.bigEye.slice(bigEyeBoyDataFull.length);
                          const sr = tigerAskRoad.smallRoad.slice(smallRoadDataFull.length);
                          const cp = tigerAskRoad.cockroach.slice(cockroachDataFull.length);
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

                  {/* Bead Plate Grid (珠盤路) — shows history as colored circles with 龍/虎/和 text */}
                  <div className="flex-1 grid grid-cols-5 grid-rows-6 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {(() => {
                      const ROWS = 6;
                      const COLS = 5;
                      const TOTAL = ROWS * COLS; // 30 cells
                      const maxShow = TOTAL - 1; // 29 — leave 1 slot for prediction
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
                              data: { result: askRoadMode, roundNumber: 0, isSuitedTie: false, dragonValue: 0, tigerValue: 0 },
                              predicted: true,
                            };
                          }
                        }
                      }
                      return cells.map((cell, i) => {
                        if (!cell.data) return <div key={`bead-${i}`} className="w-full h-full bg-white" />;
                        const round = cell.data;
                        const nr = normalizeResult(round.result);
                        const bgColor = nr === 'dragon' ? '#DC2626' : nr === 'tiger' ? '#2563EB' : '#16A34A';
                        const label = nr === 'dragon' ? t('dtRoadDragon') : nr === 'tiger' ? t('dtRoadTiger') : t('dtRoadTie');
                        const blinkStyle = cell.predicted ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
                        return (
                          <div key={`bead-${i}`} className="relative w-full h-full flex items-center justify-center bg-white">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: bgColor, fontSize: '10px', ...blinkStyle }}>
                              {label}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Bottom Stats bar */}
                <div className="flex items-center justify-around py-1.5 bg-[#1a1f2e]">
                  <span className="text-red-500 font-bold text-sm">{t('dtRoadDragon')} <span className="text-white">{dragonWins}</span></span>
                  <span className="text-blue-500 font-bold text-sm">{t('dtRoadTiger')} <span className="text-white">{tigerWins}</span></span>
                  <span className="text-green-500 font-bold text-sm">{t('dtRoadTie')} <span className="text-white">{ties}</span></span>
                </div>
              </div>

              {/* Center: Betting Buttons - All on casino green felt */}
              <div className="flex-1 flex flex-col border-l border-r border-[#d4af37]/30 casino-betting-surface">
                {/* Row 0 - 龍大/龍小/同花和/虎小/虎大 */}
                <div className="flex h-[40px] lg:h-[60px] border-b border-[#d4af37]/30">
                  <button
                    onClick={(e) => handleBet('dragon_big', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon_big') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-blue-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dragonBig')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:1</span>
                    {getBetAmount('dragon_big') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dragon_big')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon_big')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dragon_big')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('dragon_small', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon_small') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-blue-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dragonSmall')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:1</span>
                    {getBetAmount('dragon_small') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dragon_small')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon_small')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dragon_small')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('dt_suited_tie', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-[1.5] py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dt_suited_tie') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-green-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dtSuitedTie')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:50</span>
                    {getBetAmount('dt_suited_tie') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dt_suited_tie')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dt_suited_tie')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dt_suited_tie')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('tiger_small', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('tiger_small') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-red-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('tigerSmall')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:1</span>
                    {getBetAmount('tiger_small') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('tiger_small')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger_small')} chipSize={16} maxChips={2} chipValue={getBetChipValue('tiger_small')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('tiger_big', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center transition disabled:opacity-50 ${getBetAmount('tiger_big') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-red-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('tigerBig')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:1</span>
                    {getBetAmount('tiger_big') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('tiger_big')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger_big')} chipSize={16} maxChips={2} chipValue={getBetChipValue('tiger_big')} />
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {/* Row 1 - 龍雙/龍單/虎單/虎雙 */}
                <div className="flex h-[40px] lg:h-[70px] border-b border-[#d4af37]/30">
                  <button
                    onClick={(e) => handleBet('dragon_even', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon_even') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-blue-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dragonEven')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:1.05</span>
                    {getBetAmount('dragon_even') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dragon_even')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon_even')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dragon_even')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('dragon_odd', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon_odd') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-blue-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dragonOdd')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:0.75</span>
                    {getBetAmount('dragon_odd') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dragon_odd')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon_odd')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dragon_odd')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('tiger_odd', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('tiger_odd') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-red-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('tigerOdd')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:0.75</span>
                    {getBetAmount('tiger_odd') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('tiger_odd')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger_odd')} chipSize={16} maxChips={2} chipValue={getBetChipValue('tiger_odd')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('tiger_even', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center transition disabled:opacity-50 ${getBetAmount('tiger_even') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-red-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('tigerEven')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:1.05</span>
                    {getBetAmount('tiger_even') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('tiger_even')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger_even')} chipSize={16} maxChips={2} chipValue={getBetChipValue('tiger_even')} />
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {/* Row 2 - 龍黑/龍紅/虎紅/虎黑 */}
                <div className="flex h-[40px] lg:h-[70px] border-b border-[#d4af37]/30">
                  <button
                    onClick={(e) => handleBet('dragon_black', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon_black') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-blue-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dragonBlack')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:0.9</span>
                    {getBetAmount('dragon_black') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dragon_black')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon_black')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dragon_black')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('dragon_red', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon_red') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-blue-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('dragonRed')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:0.9</span>
                    {getBetAmount('dragon_red') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('dragon_red')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon_red')} chipSize={16} maxChips={2} chipValue={getBetChipValue('dragon_red')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('tiger_red', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('tiger_red') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-red-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('tigerRed')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:0.9</span>
                    {getBetAmount('tiger_red') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('tiger_red')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger_red')} chipSize={16} maxChips={2} chipValue={getBetChipValue('tiger_red')} />
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleBet('tiger_black', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-1 py-0.5 lg:py-0 flex flex-col items-center justify-center transition disabled:opacity-50 ${getBetAmount('tiger_black') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="text-red-300 text-[10px] lg:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('tigerBlack')}</span>
                    <span className="text-[#d4af37] text-[8px] lg:text-xs font-medium">1:0.9</span>
                    {getBetAmount('tiger_black') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[8px] font-bold px-1 rounded-full z-10">{getBetAmount('tiger_black')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger_black')} chipSize={16} maxChips={2} chipValue={getBetChipValue('tiger_black')} />
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {/* Row 3 - Main: 龍 / 和 / 虎 (large buttons) */}
                <div className="flex flex-1">
                  {/* 龍 - Dragon (Blue) */}
                  <button
                    onClick={(e) => handleBet('dragon', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-player relative flex-[2] py-1 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dragon') > 0 ? 'has-bet' : ''}`}
                  >
                    <div className="casino-corner-ornament top-left hidden sm:block" />
                    <div className="casino-corner-ornament bottom-right hidden sm:block" />
                    <span className="casino-display text-blue-300 text-lg sm:text-4xl lg:text-5xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('dtDragon')}</span>
                    <span className="text-[#d4af37] text-[10px] sm:text-lg lg:text-xl font-bold">1:1</span>
                    {getBetAmount('dragon') > 0 && (
                      <>
                        <div className="absolute top-0.5 right-0.5 sm:top-3 sm:right-3 bg-[#d4af37] text-black text-[8px] sm:text-sm font-bold px-1 py-0 rounded-full shadow-lg z-10">{getBetAmount('dragon')}</div>
                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dragon')} chipSize={20} maxChips={3} chipValue={getBetChipValue('dragon')} />
                        </div>
                      </>
                    )}
                  </button>

                  {/* 和 - Tie (Green) */}
                  <button
                    onClick={(e) => handleBet('dt_tie', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot relative flex-[1.2] py-1 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('dt_tie') > 0 ? 'has-bet' : ''}`}
                  >
                    <span className="casino-display text-green-300 text-lg sm:text-4xl lg:text-5xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('dtTie')}</span>
                    <span className="text-[#d4af37] text-[10px] sm:text-lg lg:text-xl font-bold">1:8</span>
                    {getBetAmount('dt_tie') > 0 && (
                      <>
                        <div className="absolute top-0.5 right-0.5 sm:top-3 sm:right-3 bg-[#d4af37] text-black text-[8px] sm:text-sm font-bold px-1 py-0 rounded-full shadow-lg z-10">{getBetAmount('dt_tie')}</div>
                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('dt_tie')} chipSize={20} maxChips={3} chipValue={getBetChipValue('dt_tie')} />
                        </div>
                      </>
                    )}
                  </button>

                  {/* 虎 - Tiger (Red) */}
                  <button
                    onClick={(e) => handleBet('tiger', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-banker relative flex-[2] py-1 sm:py-6 lg:py-0 flex flex-col items-center justify-center transition disabled:opacity-50 ${getBetAmount('tiger') > 0 ? 'has-bet' : ''}`}
                  >
                    <div className="casino-corner-ornament top-right hidden sm:block" />
                    <div className="casino-corner-ornament bottom-left hidden sm:block" />
                    <span className="casino-display text-red-300 text-lg sm:text-4xl lg:text-5xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('dtTiger')}</span>
                    <span className="text-[#d4af37] text-[10px] sm:text-lg lg:text-xl font-bold">1:1</span>
                    {getBetAmount('tiger') > 0 && (
                      <>
                        <div className="absolute top-0.5 right-0.5 sm:top-3 sm:right-3 bg-[#d4af37] text-black text-[8px] sm:text-sm font-bold px-1 py-0 rounded-full shadow-lg z-10">{getBetAmount('tiger')}</div>
                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tiger')} chipSize={20} maxChips={3} chipValue={getBetChipValue('tiger')} />
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {/* Chips Row - Desktop */}
                <div ref={chipSelectorRef} className="hidden lg:flex justify-center items-center gap-1.5 py-2 px-2 bg-[#1a1f2e]">
                  {displayedChips.map((value) => (
                    <Chip
                      key={value}
                      value={value}
                      selected={selectedChip === value}
                      onClick={() => setSelectedChip(value)}
                      disabled={value > balance}
                    />
                  ))}
                  <button
                    onClick={() => setIsChipSettingsOpen(true)}
                    className="relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 border-2 border-white/20 shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
                    title={t('chipSettings') || '籌碼設置'}
                  >
                    <Coins className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />
                  </button>
                </div>

                {/* Mobile: Two rows - Chips on top, Balance/Actions on bottom */}
                <div className="lg:hidden bg-[#1a1f2e]">
                  {/* Row 1: Chips */}
                  <div className="flex items-center justify-center gap-0.5 py-0.5 px-1 overflow-x-auto scrollbar-hide">
                    {displayedChips.map((value) => (
                      <Chip
                        key={value}
                        value={value}
                        selected={selectedChip === value}
                        onClick={() => setSelectedChip(value)}
                        disabled={value > balance}
                        extraSmall={true}
                      />
                    ))}
                    <button
                      onClick={() => setIsChipSettingsOpen(true)}
                      className="relative rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 border-2 border-white/20 shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 w-6 h-6 shrink-0"
                    >
                      <Coins className="relative z-10 text-white drop-shadow-lg w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 2: Balance + Actions */}
                  <div className="flex items-center justify-between py-1 px-2 border-t border-gray-700/50">
                    {/* Left: Balance Info */}
                    <div className="flex items-center gap-3 text-[9px]">
                      <span className="text-gray-400">餘額 <span className="text-yellow-400 font-bold">{balance.toLocaleString()}</span></span>
                      <span className="text-gray-400">下注 <span className="text-white font-bold">{totalBet.toLocaleString()}</span></span>
                      <span className="text-gray-400">輸贏 <span className={`font-bold ${sessionWinLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{sessionWinLoss.toLocaleString()}</span></span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                      {/* Action Buttons */}
                      {pendingBets.length > 0 && (
                        <>
                          <button
                            onClick={handleCancel}
                            className="p-1 bg-gray-700 text-gray-300 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleRepeat}
                            className="p-1 bg-gray-700 text-gray-300 rounded"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {canBet && pendingBets.length > 0 && (
                        <button
                          onClick={handleConfirm}
                          className="px-2 py-1 text-[9px] bg-amber-500 text-black font-bold rounded flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" />
                          確認
                        </button>
                      )}
                    </div>
                  </div>
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
                            <DTBigRoadCell
                              key={`${rowIndex}-${colIndex}`}
                              result={askBigRoadPrediction.result}
                              blink={true}
                            />
                          );
                        }
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

                {/* Three Derived Roads - side by side */}
                <div className="flex h-[72px] border-t border-gray-400">
                  {/* Big Eye Boy - hollow circles */}
                  <div className="flex-1 border-r border-gray-400" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-8 grid-rows-4 gap-px h-full" style={{ backgroundColor: '#D1D5DB' }}>
                      {Array(DERIVED_DISPLAY_CELLS).fill(null).map((_, i) => {
                        const isPredicted = activeAskRoad && i === bigEyeBoyData.length && i < DERIVED_DISPLAY_CELLS && activeAskRoad.bigEye.length > 0;
                        const predValue = isPredicted ? activeAskRoad.bigEye[0] : undefined;
                        return (
                          <DTDerivedRoadCell
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
                          <DTDerivedRoadCell
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
                          <DTDerivedRoadCell
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

                {/* Bottom Stats */}
                <div className="flex items-center justify-around py-1.5 bg-[#1a1f2e]">
                  <span className="text-red-500 font-bold text-sm">龍 <span className="text-white">{dragonWins}</span></span>
                  <span className="text-blue-500 font-bold text-sm">虎 <span className="text-white">{tigerWins}</span></span>
                  <span className="text-green-500 font-bold text-sm">和 <span className="text-white">{ties}</span></span>
                </div>
              </div>
            </div>

            {/* Roadmap Section - Bottom area (dark theme like Baccarat) - Mobile/Tablet only */}
            <div className="bg-[#0d1117] lg:hidden">
              {/* Stats Summary */}
              <div className="flex items-center justify-between px-2 py-1 text-[10px] border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-red-500 font-bold">龍 <span className="text-white">{dragonWins}</span></span>
                  <span className="text-blue-500 font-bold">虎 <span className="text-white">{tigerWins}</span></span>
                  <span className="text-green-500 font-bold">和 <span className="text-white">{ties}</span></span>
                </div>
                <span className="text-gray-400">總 <span className="text-white">{total}</span></span>
              </div>
              {/* Roadmap using same layout as Baccarat LobbyRoadmap */}
              <div className="h-[120px]">
                <DragonTigerRoadmap roadHistory={roadmapData} />
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
