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
} from 'lucide-react';
import { MobileNavBar } from '../components/layout/MobileNavBar';
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
import TableChipDisplay from '../components/game/TableChipDisplay';
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
function Chip({ value, selected, onClick, disabled }: { value: number; selected: boolean; onClick: () => void; disabled?: boolean }) {
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
      <CasinoChip size={56} value={value} label={formatChipValue(value)} />
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

// Dragon Tiger Big Road Cell
function DTBigRoadCell({ result: rawResult, tieCount = 0, blink }: { result?: string; tieCount?: number; blink?: boolean }) {
  const result = normalizeResult(rawResult);

  if (!result || result === 'tie') {
    return <div className="w-full h-full bg-white" />;
  }

  const colors: Record<string, { border: string }> = {
    dragon: { border: '#DC2626' },  // Red for Dragon
    tiger: { border: '#2563EB' },   // Blue for Tiger
  };
  const color = colors[result];

  if (!color) {
    return <div className="w-full h-full bg-white" />;
  }

  const blinkStyle = blink ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white" style={{ minWidth: 0, minHeight: 0 }}>
      <div
        className="rounded-full"
        style={{ width: '80%', height: '80%', maxWidth: 20, maxHeight: 20, border: `2px solid ${color.border}`, ...blinkStyle }}
      />
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

// Derived Road Cell for Dragon Tiger
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

  return (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <svg viewBox="0 0 10 10" className="w-3 h-3" style={blinkStyle}>
        <line x1="2" y1="8" x2="8" y2="2" stroke={color.fill} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
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

// Get a sliding window of the rightmost displayCols columns
function getDTBigRoadWindow(grid: DTBigRoadGrid, displayCols: number, extraRoom: number = 1): { window: DTBigRoadGrid; startCol: number } {
  const maxCol = getDTMaxCol(grid);
  const startCol = Math.max(0, maxCol - displayCols + 1 + extraRoom);
  const win: DTBigRoadGrid = Array(6).fill(null).map(() => Array(displayCols).fill(null));
  for (let row = 0; row < 6; row++) {
    for (let c = 0; c < displayCols; c++) {
      win[row][c] = grid[row]?.[startCol + c] || null;
    }
  }
  return { window: win, startCol };
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

  // Ask Road mode: 'none' | 'dragon' | 'tiger'
  const [askRoadMode, setAskRoadMode] = useState<'none' | 'dragon' | 'tiger'>('none');

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

  // Card animation: track reconnection to skip animation
  // Normal flow: phase → dealing first, then cards arrive individually
  // Reconnect: dt:state sends phase + cards together
  const [skipCardAnim, setSkipCardAnim] = useState(false);
  const [vsPulse, setVsPulse] = useState(false);
  const expectingDTCardsRef = useRef(false);

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

  const handleBet = (type: DragonTigerBetType) => {
    if (!canBet) return;
    const success = addPendingBet(type);
    if (success) playSound('chipPlace');
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

  // Flat derived roads (full data)
  const bigEyeBoyDataFull = calculateDTBigEyeBoy(bigRoadFull);
  const smallRoadDataFull = calculateDTSmallRoad(bigRoadFull);
  const cockroachDataFull = calculateDTCockroachPig(bigRoadFull);

  const BIG_ROAD_DISPLAY_COLS = 20;
  const DERIVED_DISPLAY_CELLS = 32; // 8 cols x 4 rows

  // Calculate Ask Roads (問路) - predict what happens if next result is dragon/tiger
  const dragonAskRoad = buildDTAskRoad(roadmapData, 'dragon');
  const tigerAskRoad = buildDTAskRoad(roadmapData, 'tiger');

  // Find predicted Big Road position on the FULL grid (not windowed)
  const getAskRoadBigRoadPredictionFull = (hypothetical: 'dragon' | 'tiger'): { row: number; col: number; result: 'dragon' | 'tiger' } | null => {
    const simData = [...roadmapData, { result: hypothetical }];
    const simGrid = buildDTBigRoad(simData);
    const simMaxCol = getDTMaxCol(simGrid);
    const curMaxCol = getDTMaxCol(bigRoadFull);
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
      const predCol = askPredFull.col;
      const maxCol = Math.max(getDTMaxCol(bigRoadFull), predCol);
      const startCol = Math.max(0, maxCol - BIG_ROAD_DISPLAY_COLS + 1);
      const win: DTBigRoadGrid = Array(6).fill(null).map(() => Array(BIG_ROAD_DISPLAY_COLS).fill(null));
      for (let row = 0; row < 6; row++) {
        for (let c = 0; c < BIG_ROAD_DISPLAY_COLS; c++) {
          win[row][c] = bigRoadFull[row]?.[startCol + c] || null;
        }
      }
      return { window: win, startCol };
    }
    return getDTBigRoadWindow(bigRoadFull, BIG_ROAD_DISPLAY_COLS);
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
            onClick={() => { const on = toggleBgm(); setIsBgmOn(on); }}
            className={`p-1 ${isBgmOn && !isMuted ? 'text-gold' : 'text-gray-400'} hover:text-white`}
            title={isBgmOn ? '關閉背景音樂' : '開啟背景音樂'}
          >
            {isBgmOn && !isMuted ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
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

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
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
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Countdown timer — over entire game area */}
          <CountdownTimer timeRemaining={timeRemaining} phase={phase} />

          {/* Video Area - 3D Dealer Table */}
          <DealerTable3D
            isDealing={phase === 'dealing'}
            dealerName={currentDealerName}
            gameType="dragonTiger"
          >
            {/* Round Info */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 rounded px-3 py-1 text-sm z-20">
              <span className="text-gray-400">{t('dragonTiger')} {shoeNumber}</span>
              <span className="text-white ml-2">{new Date().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`ml-2 font-bold ${phaseDisplay.color}`}>{roundNumber} - {phaseDisplay.text}</span>
            </div>

            {/* Cards Display - Dragon vs Tiger */}
            <div className="flex-1 relative flex items-end justify-center pb-24 sm:pb-28">
              <div className="flex items-center gap-6 sm:gap-12 lg:gap-20">
                {/* Dragon Side */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-4">{t('dtDragon')}</div>
                  <div className="relative">
                    {dragonCard ? (
                      <AnimatedPlayingCard
                        card={dragonCard}
                        size="lg"
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
                    ) : (
                      <div className="w-24 h-32 bg-gradient-to-br from-red-900 to-red-950 rounded-lg border-2 border-red-700 flex items-center justify-center">
                        <span className="text-red-400 text-4xl">{t('dtDragon')}</span>
                      </div>
                    )}
                    <AnimatePresence>
                      {dragonValue !== null && dragonFlipped && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full font-bold text-lg"
                        >
                          {dragonValue}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* VS */}
                <div className={`text-4xl font-bold text-gray-500 ${vsPulse ? 'vs-flash' : ''}`}>VS</div>

                {/* Tiger Side */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-4">{t('dtTiger')}</div>
                  <div className="relative">
                    {tigerCard ? (
                      <AnimatedPlayingCard
                        card={tigerCard}
                        size="lg"
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
                    ) : (
                      <div className="w-24 h-32 bg-gradient-to-br from-blue-900 to-blue-950 rounded-lg border-2 border-blue-700 flex items-center justify-center">
                        <span className="text-blue-400 text-4xl">{t('dtTiger')}</span>
                      </div>
                    )}
                    <AnimatePresence>
                      {tigerValue !== null && tigerFlipped && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full font-bold text-lg"
                        >
                          {tigerValue}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Fake bet chips on table */}
              <TableChipDisplay
                targetBets={{
                  player: (fakeBets.dragon || 0) + (fakeBets.dragon_big || 0) + (fakeBets.dragon_small || 0) + (fakeBets.dragon_odd || 0) + (fakeBets.dragon_even || 0) + (fakeBets.dragon_red || 0) + (fakeBets.dragon_black || 0),
                  tie: (fakeBets.dt_tie || 0) + (fakeBets.dt_suited_tie || 0),
                  banker: (fakeBets.tiger || 0) + (fakeBets.tiger_big || 0) + (fakeBets.tiger_small || 0) + (fakeBets.tiger_odd || 0) + (fakeBets.tiger_even || 0) + (fakeBets.tiger_red || 0) + (fakeBets.tiger_black || 0),
                }}
                phase={phase}
              />

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
            </div>
          </DealerTable3D>

          {/* Betting Panel */}
          <div className="bg-[#0d1117]">
            {/* Control Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-2 sm:px-4 py-2 gap-2 border-b border-gray-800/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-gray-400">{t('dragonTiger')}</span>
              </div>
              <div className="hidden xl:flex items-center gap-2">
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
              <div className="hidden lg:flex items-center gap-3">
                <button className="text-xs text-gray-400 hover:text-white">{t('signal')}</button>
                <button className="text-xs text-orange-400 hover:text-orange-300">{t('gifts')}</button>
              </div>
            </div>

            {/* Betting Areas - Full Width */}
            <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[200px] lg:h-[360px] pb-16 xl:pb-0" style={{ backgroundColor: '#FFFFFF' }}>
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

              {/* Center: Betting Buttons */}
              <div className="flex-1 flex flex-col border-l border-r border-gray-400">
                {/* Row 0 - 龍大/龍小/同花和/虎小/虎大 */}
                <div className="flex flex-wrap lg:flex-nowrap h-auto lg:h-[60px] border-b border-gray-400">
                  <button
                    onClick={() => handleBet('dragon_big')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[50px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_big') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('dragonBig')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:1</span>
                    {getBetAmount('dragon_big') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_big')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('dragon_small')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[50px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_small') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('dragonSmall')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:1</span>
                    {getBetAmount('dragon_small') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_small')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('dt_suited_tie')}
                    disabled={!canBet}
                    className={`relative flex-[1.5] min-w-[70px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dt_suited_tie') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FEF9C3' }}
                  >
                    <span className="text-amber-700 text-xs sm:text-sm font-bold">{t('dtSuitedTie')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:50</span>
                    {getBetAmount('dt_suited_tie') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dt_suited_tie')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_small')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[50px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_small') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('tigerSmall')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:1</span>
                    {getBetAmount('tiger_small') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_small')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_big')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[50px] py-2 lg:py-0 flex flex-col items-center justify-center border-b lg:border-b-0 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_big') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('tigerBig')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:1</span>
                    {getBetAmount('tiger_big') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_big')}</div>
                    )}
                  </button>
                </div>

                {/* Row 1 - 龍雙/龍單/虎單/虎雙 */}
                <div className="flex flex-wrap lg:flex-nowrap h-auto lg:h-[70px] border-b border-gray-400">
                  <button
                    onClick={() => handleBet('dragon_even')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_even') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('dragonEven')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:1.05</span>
                    {getBetAmount('dragon_even') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_even')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('dragon_odd')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_odd') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('dragonOdd')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:0.75</span>
                    {getBetAmount('dragon_odd') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_odd')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_odd')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_odd') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('tigerOdd')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:0.75</span>
                    {getBetAmount('tiger_odd') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_odd')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_even')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-b lg:border-b-0 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_even') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('tigerEven')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:1.05</span>
                    {getBetAmount('tiger_even') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_even')}</div>
                    )}
                  </button>
                </div>

                {/* Row 2 - 龍黑/龍紅/虎紅/虎黑 */}
                <div className="flex flex-wrap lg:flex-nowrap h-auto lg:h-[70px] border-b border-gray-400">
                  <button
                    onClick={() => handleBet('dragon_black')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_black') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('dragonBlack')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:0.9</span>
                    {getBetAmount('dragon_black') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_black')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('dragon_red')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon_red') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-xs sm:text-sm font-medium">{t('dragonRed')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:0.9</span>
                    {getBetAmount('dragon_red') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('dragon_red')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_red')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_red') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('tigerRed')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:0.9</span>
                    {getBetAmount('tiger_red') > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">{getBetAmount('tiger_red')}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleBet('tiger_black')}
                    disabled={!canBet}
                    className={`relative flex-1 min-w-[60px] py-2 lg:py-0 flex flex-col items-center justify-center border-b lg:border-b-0 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger_black') > 0 ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-xs sm:text-sm font-medium">{t('tigerBlack')}</span>
                    <span className="text-red-600 text-[10px] sm:text-xs">1:0.9</span>
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
                    className={`relative flex-[2] py-4 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dragon') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <span className="text-blue-700 text-3xl sm:text-4xl lg:text-5xl font-black">{t('dtDragon')}</span>
                    <span className="text-red-600 text-base sm:text-lg lg:text-xl font-bold mt-1">1:1</span>
                    {getBetAmount('dragon') > 0 && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow">{getBetAmount('dragon')}</div>
                    )}
                  </button>

                  {/* 和 - Yellow background */}
                  <button
                    onClick={() => handleBet('dt_tie')}
                    disabled={!canBet}
                    className={`relative flex-[1.2] py-4 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-gray-400 transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('dt_tie') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FEF9C3' }}
                  >
                    <span className="text-green-700 text-3xl sm:text-4xl lg:text-5xl font-black">{t('dtTie')}</span>
                    <span className="text-red-600 text-base sm:text-lg lg:text-xl font-bold mt-1">1:8</span>
                    {getBetAmount('dt_tie') > 0 && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow">{getBetAmount('dt_tie')}</div>
                    )}
                  </button>

                  {/* 虎 - Pink/Red background */}
                  <button
                    onClick={() => handleBet('tiger')}
                    disabled={!canBet}
                    className={`relative flex-[2] py-4 sm:py-6 lg:py-0 flex flex-col items-center justify-center transition hover:brightness-95 disabled:opacity-50 ${getBetAmount('tiger') > 0 ? 'ring-3 ring-yellow-400 ring-inset' : ''}`}
                    style={{ backgroundColor: '#FFE4E6' }}
                  >
                    <span className="text-red-700 text-3xl sm:text-4xl lg:text-5xl font-black">{t('dtTiger')}</span>
                    <span className="text-red-600 text-base sm:text-lg lg:text-xl font-bold mt-1">1:1</span>
                    {getBetAmount('tiger') > 0 && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-yellow-500 text-black text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow">{getBetAmount('tiger')}</div>
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
                    className="relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 border-2 border-white/20 shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
                    title={t('chipSettings') || '籌碼設置'}
                  >
                    <Coins className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />
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
                  <span className="text-red-500 font-bold text-sm">{t('dtRoadDragon')} <span className="text-white">{dragonWins}</span></span>
                  <span className="text-blue-500 font-bold text-sm">{t('dtRoadTiger')} <span className="text-white">{tigerWins}</span></span>
                  <span className="text-gray-400 text-sm">{t('total')} <span className="text-white">{total}</span></span>
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
        hasBets={hasPendingBets}
      />
    </div>
  );
}
