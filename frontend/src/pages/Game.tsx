import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { dealerApi, tablesApi } from '../services/api';
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
  Heart,
  HeartOff,
  FileText,
  Info,
  X,
  RotateCcw,
  Check,
  Wifi,
  WifiOff,
  ArrowUpDown,
  Gift,
  Send,
  MapPin,
  CheckCircle,
  AlertCircle,
  Coins,
  Music,
  Music2,
  Menu,
  Home,
} from 'lucide-react';
import { MobileNavBar } from '../components/layout/MobileNavBar';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTTS } from '../hooks/useTTS';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import type { BetType, GameResult } from '../types';
import {
  GameSettingsModal,
  GameRulesModal,
  GameReportModal,
  FollowingListModal,
  TableSwitchModal,
  GiftModal,
  RoadmapModal,
} from '../components/game/modals';
import AnimatedPlayingCard from '../components/game/AnimatedPlayingCard';
import ChipSettingsModal from '../components/game/ChipSettingsModal';
import CasinoChip, { formatChipValue } from '../components/game/CasinoChip';
import CountdownTimer from '../components/game/CountdownTimer';
import { useFakeChipAmounts, FakeChipStack, FakeBetStats } from '../components/game/TableChipDisplay';
import DealerTable3D from '../components/game/DealerTable3D';
import GameLoadingScreen from '../components/game/GameLoadingScreen';
import LobbyRoadmap from '../components/lobby/LobbyRoadmap';
import MarqueeChat, { useMarqueeChat, MarqueeQuickButtons } from '../components/game/MarqueeChat';
import { FlyingChipOverlay, useFlyingChips, ChipStack } from '../components/game/BetAreaChips';
import NoticeMarquee from '../components/game/NoticeMarquee';
import { VirtualPlayersBar } from '../components/game/VirtualPlayersBar';

// Chip component - uses CasinoChip SVG
function Chip({ value, selected, onClick, disabled, small, extraSmall }: { value: number | string; selected: boolean; onClick: () => void; disabled?: boolean; small?: boolean; extraSmall?: boolean }) {
  const numValue = typeof value === 'number' ? value : undefined;
  const label = typeof value === 'string' ? value : formatChipValue(value);
  const chipSize = extraSmall ? 44 : small ? 32 : 56;

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
      <CasinoChip size={chipSize} value={numValue} label={label} />
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
    <div className="relative w-full h-full flex items-center justify-center bg-white" style={{ minWidth: 0, minHeight: 0, aspectRatio: '1' }}>
      {/* Main circle - responsive size, hollow */}
      <div
        className="rounded-full aspect-square"
        style={{
          width: '80%',
          maxWidth: 20,
          border: `2px solid ${color.border}`,
          ...(blink ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {})
        }}
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

// Derived Road Grid - displays data in 2x2 mini-cells per grid cell with grid lines
// Each visual grid cell contains 4 small circles arranged in a 2x2 pattern
function DerivedRoadGrid({ data, type, predictedCount = 0 }: { data: ('red' | 'blue')[]; type: 'big_eye' | 'small' | 'cockroach'; predictedCount?: number }) {
  // Display: 6 rows x 12 cols of small circles
  const SMALL_ROWS = 6;
  const SMALL_COLS = 12;

  // Build grid using Big Road layout logic:
  // Same color goes down, different color starts new column
  // Dragon tail when hitting bottom or occupied cell
  const grid2D: (('red' | 'blue') | null)[][] = Array(SMALL_ROWS).fill(null).map(() => Array(SMALL_COLS).fill(null));
  const predictedCells = new Set<string>();

  // Group consecutive same colors into columns
  const columns: ('red' | 'blue')[][] = [];
  let currentCol: ('red' | 'blue')[] = [];
  let lastColor: 'red' | 'blue' | null = null;

  for (const color of data) {
    if (lastColor !== null && color !== lastColor) {
      if (currentCol.length > 0) {
        columns.push(currentCol);
      }
      currentCol = [color];
    } else {
      currentCol.push(color);
    }
    lastColor = color;
  }
  if (currentCol.length > 0) {
    columns.push(currentCol);
  }

  // Place columns in grid with dragon tail handling
  let gridCol = 0;
  let dataIndex = 0;
  const predictedStartIndex = data.length - predictedCount;
  for (const column of columns) {
    let row = 0;
    let col = gridCol;

    for (const color of column) {
      if (row >= SMALL_ROWS) {
        col++;
        row = SMALL_ROWS - 1;
      }

      while (col < SMALL_COLS && grid2D[row][col] !== null) {
        col++;
      }

      if (col < SMALL_COLS) {
        grid2D[row][col] = color;
        if (dataIndex >= predictedStartIndex) {
          predictedCells.add(`${row}-${col}`);
        }
      }
      row++;
      dataIndex++;
    }

    gridCol = col + 1;
  }

  const colors = {
    red: { border: '#DC2626', fill: '#DC2626' },
    blue: { border: '#2563EB', fill: '#2563EB' },
  };

  // Grid cells are 2x2, so we have 3 rows x 6 cols of grid cells
  const GRID_ROWS = Math.ceil(SMALL_ROWS / 2);
  const GRID_COLS = Math.ceil(SMALL_COLS / 2);

  const gridCells: React.ReactNode[] = [];

  for (let gc = 0; gc < GRID_COLS; gc++) {
    for (let gr = 0; gr < GRID_ROWS; gr++) {
      const key = `grid-${gr}-${gc}`;

      const miniCells: React.ReactNode[] = [];
      for (let mr = 0; mr < 2; mr++) {
        for (let mc = 0; mc < 2; mc++) {
          const dataRow = gr * 2 + mr;
          const dataCol = gc * 2 + mc;
          const value = grid2D[dataRow]?.[dataCol] ?? null;
          const miniKey = `mini-${mr}-${mc}`;

          if (!value) {
            miniCells.push(<div key={miniKey} />);
            continue;
          }

          const color = colors[value];
          const isPred = predictedCells.has(`${dataRow}-${dataCol}`);
          const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};

          if (type === 'big_eye') {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ border: `1.5px solid ${color.border}`, ...blinkStyle }}
                />
              </div>
            );
          } else if (type === 'small') {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: color.fill, ...blinkStyle }}
                />
              </div>
            );
          } else {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center" style={blinkStyle}>
                <svg viewBox="0 0 10 10" className="w-[9px] h-[9px]">
                  <line x1="1" y1="9" x2="9" y2="1" stroke={color.fill} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            );
          }
        }
      }

      gridCells.push(
        <div
          key={key}
          className="grid bg-white"
          style={{
            gridTemplateRows: 'repeat(2, 1fr)',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
        >
          {miniCells}
        </div>
      );
    }
  }

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridAutoFlow: 'column',
        gap: '1px',
        backgroundColor: '#D1D5DB',
      }}
    >
      {gridCells}
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

// Calculate derived road (Big Eye Boy, Small Road, Cockroach Pig)
// offset: 1 for Big Eye Boy, 2 for Small Road, 3 for Cockroach Pig
// Rules:
// - New column: Compare depths of (col-1) and (col-1-offset). Same depth = red, different = blue
// - Same column: Check if cell at (row-1, col-offset) exists. Exists = red, doesn't = blue
function calculateDerivedRoad(bigRoadGrid: BigRoadGrid, offset: number): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const maxCol = getMaxCol(bigRoadGrid);

  // Track position in Big Road as we iterate
  let prevCol = -1;

  // Start from column (offset + 1) because we need at least (offset + 1) columns to compare
  // Big Eye Boy starts after first entry in column 2 (col index 1)
  // Small Road starts after first entry in column 3 (col index 2)
  // Cockroach starts after first entry in column 4 (col index 3)
  const startCol = offset;

  for (let col = startCol; col <= maxCol; col++) {
    for (let row = 0; row < 6; row++) {
      const cell = bigRoadGrid[row]?.[col];
      if (!cell) continue;

      // Check if this is first entry in a new column
      const isNewColumn = col !== prevCol;

      if (isNewColumn) {
        // New column rule: compare depths of previous two relevant columns
        // For Big Eye Boy (offset=1): compare col-1 and col-2
        // For Small Road (offset=2): compare col-1 and col-3
        // For Cockroach (offset=3): compare col-1 and col-4
        const prevColDepth = getColumnLength(bigRoadGrid, col - 1);
        const compareColDepth = getColumnLength(bigRoadGrid, col - 1 - offset);

        // Same depth = red (pattern), different depth = blue (choppy)
        results.push(prevColDepth === compareColDepth ? 'red' : 'blue');
        prevCol = col;
      } else {
        // Same column rule: check if there's a cell at (current row - 1) in the compare column
        // Look at column (col - offset), row (row - 1)
        const compareCol = col - offset;
        const compareRow = row - 1;

        if (compareRow >= 0 && compareCol >= 0) {
          const hasCell = bigRoadGrid[compareRow]?.[compareCol] !== null;
          // Has cell = red (pattern continues), no cell = blue (pattern breaks)
          results.push(hasCell ? 'red' : 'blue');
        }
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
  let isTailing = false; // Dragon tail mode (horizontal movement)

  for (const round of data) {
    // Tie doesn't create new cell, just increment counter
    if (round.result === 'tie') {
      tieCount++;
      continue;
    }

    if (lastResult === null) {
      // First non-tie result - start at top-left
      lastResult = round.result;
    } else if (round.result !== lastResult) {
      // Result changed - start new column
      col++;
      row = 0;
      lastResult = round.result;
      isTailing = false;

      // Check if position is occupied (collision with previous dragon tail)
      // If so, move right until we find an empty spot
      while (col < MAX_COLS && grid[row][col] !== null) {
        col++;
      }
    } else {
      // Same result - try to continue down
      if (isTailing) {
        // Already tailing horizontally - continue right
        col++;
      } else {
        // Try to go down
        const nextRow = row + 1;
        if (nextRow >= ROWS) {
          // Hit bottom of grid - start dragon tail (go right)
          col++;
          isTailing = true;
        } else if (grid[nextRow][col] !== null) {
          // Position below is occupied (collision) - go right instead
          col++;
          isTailing = true;
        } else {
          // Position below is free - go down
          row = nextRow;
        }
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
function getBigRoadWindow(grid: BigRoadGrid, displayCols: number): { window: BigRoadGrid; startCol: number } {
  const maxCol = getMaxCol(grid);
  // Show the rightmost displayCols columns, sliding as new data comes in
  // When maxCol < displayCols - 1, start from 0 (not full yet)
  // When maxCol >= displayCols - 1, slide so the newest data is at the right edge
  const startCol = Math.max(0, maxCol - displayCols + 2);
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Get tableId from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const tableId = searchParams.get('table') || undefined;

  // Assign dealer model based on tableId (evenly distribute v1/v2/v3/v4)
  const dealerModels = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] as const;
  const dealerModelForTable = dealerModels[
    (tableId || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 6
  ];

  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [isTableSwitchOpen, setIsTableSwitchOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  // Mobile hamburger menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // UI states
  const [isMuted, setIsMuted] = useState(false);
  const { play: playSound } = useTTS(isMuted);
  const [isBgmOn, setIsBgmOn] = useState(true);
  const { toggleBgm } = useBackgroundMusic(isMuted);
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

  // Flying chips animation
  const { flyingChips, addFlyingChip } = useFlyingChips();
  const chipSelectorRef = useRef<HTMLDivElement>(null);

  // Marquee chat - single shared state for both QuickButtons and MarqueeChat
  const { cooldown: marqueeCooldown, sendMessage: sendMarqueeMessage, messages: marqueeMessages, removeMessage: removeMarqueeMessage } = useMarqueeChat(user?.username || '玩家');

  // Bet success notification
  const [betNotification, setBetNotification] = useState<{
    show: boolean;
    bets: Array<{ type: string; amount: number }>;
    total: number;
  }>({ show: false, bets: [], total: 0 });

  // Bet error notification (for limit validation failures)
  const [betError, setBetError] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Previous confirmed bets count to detect new confirmations
  const prevConfirmedBetsRef = useRef<number>(0);

  // Current dealer name — fetched from API
  const [currentDealerName, setCurrentDealerName] = useState<string>('');

  // Fetch table info to get dealer name
  useEffect(() => {
    const fetchTableInfo = async () => {
      if (!tableId) return;
      try {
        const res = await tablesApi.getTable(tableId);
        if (res.data?.dealer) {
          setCurrentDealerName(res.data.dealer);
        }
      } catch (err) {
        console.error('[Game] Failed to fetch table info:', err);
      }
    };
    fetchTableInfo();
  }, [tableId]);

  // Check initial follow status
  useEffect(() => {
    if (!currentDealerName) return;
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
    lastPlayerPair,
    lastBankerPair,
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
    loadRepeatBets,
    bettingLimits,
    displayedChips,
    clearPendingBets,
    resetForNewRound,
    fakeBets,
    fakeBroadcasts,
    removeFakeBroadcast,
    isShuffling,
  } = useGameStore();

  // Progressive fake chip amounts for bet areas
  const fakeAmounts = useFakeChipAmounts(fakeBets, phase);

  // Can place bets only during betting phase
  const canBet = phase === 'betting' && isConnected && !isShuffling;

  // Card animation: track whether cards arrived via reconnect (skip animation)
  // Normal flow: phase changes to 'dealing' first, then cards arrive individually
  // Reconnect flow: game:state sends phase + cards together → cards appear when phase is already dealing/result
  // Strategy: when phase changes to 'dealing', mark that we expect cards with animation.
  //           If cards appear without a recent phase transition to 'dealing', it's a reconnect.
  const [skipCardAnim, setSkipCardAnim] = useState(false);
  const [pointsPulseKey, setPointsPulseKey] = useState(0);

  // Cumulative win/loss for this session
  const [sessionWinLoss, setSessionWinLoss] = useState(0);
  const prevSettlementRef = useRef<typeof lastSettlement>(null);

  // Dealer animation: keep dealing animation active until all cards are dealt and flipped
  // This is separate from phase because we need to keep animating during third card delays
  const [dealerAnimating, setDealerAnimating] = useState(false);
  const dealerAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Responsive breakpoint
  const bp = useBreakpoint();
  const cardSize = bp === 'mobile' ? 'xs' : bp === 'tablet' ? 'md' : 'lg';
  const thirdCardHeight = bp === 'mobile' ? 36 : bp === 'tablet' ? 65 : 90;
  // Cards fly from dealer's hand position (above table, center)
  const flyY = bp === 'mobile' ? -100 : bp === 'tablet' ? -220 : -350;
  const flyX = bp === 'mobile' ? 20 : bp === 'tablet' ? 60 : 90;
  const thirdFlyY = bp === 'mobile' ? -80 : bp === 'tablet' ? -180 : -300;
  const cardAreaRef = useRef<HTMLDivElement>(null);
  const expectingCardsRef = useRef(false);

  // Displayed points — only update when card flip animation completes (not on socket event)
  const [displayPlayerPoints, setDisplayPlayerPoints] = useState<number | null>(null);
  const [displayBankerPoints, setDisplayBankerPoints] = useState<number | null>(null);
  // Track how many cards have finished flipping for result timing
  const [allFlipsDone, setAllFlipsDone] = useState(false);
  const flippedCountRef = useRef(0);
  const expectedCardsRef = useRef(0);
  // Track which individual cards have been visually revealed (for text preview)
  const [revealedPlayerCards, setRevealedPlayerCards] = useState<Set<number>>(new Set());
  const [revealedBankerCards, setRevealedBankerCards] = useState<Set<number>>(new Set());

  // Deferred reset: when betting phase arrives but result display is pending/showing, delay the reset
  const pendingResetRef = useRef(false);

  const doRoundReset = useCallback(() => {
    console.log('[Game] 🧹 Executing round reset NOW');
    pendingResetRef.current = false;
    expectingCardsRef.current = false;
    setSkipCardAnim(false);
    setDealerAnimating(false); // Reset dealer animation
    if (dealerAnimTimerRef.current) {
      clearTimeout(dealerAnimTimerRef.current);
      dealerAnimTimerRef.current = null;
    }
    setDisplayPlayerPoints(null);
    setDisplayBankerPoints(null);
    setAllFlipsDone(false);
    flippedCountRef.current = 0;
    expectedCardsRef.current = 0;
    setRevealedPlayerCards(new Set());
    setRevealedBankerCards(new Set());
    resetForNewRound(); // Clear store: cards, result, bets, etc.
  }, [resetForNewRound]);

  // When phase changes to dealing, mark that we expect animated cards
  const prevPhaseRef = useRef(phase);
  const pendingPlaceBetsSoundRef = useRef(false);
  useEffect(() => {
    console.log(`[Game] Phase changed: ${prevPhaseRef.current} → ${phase}`);
    if (phase === 'dealing' && prevPhaseRef.current !== 'dealing') {
      expectingCardsRef.current = true;
      setDealerAnimating(true); // Start dealer animation
      console.log('[Game] Phase→dealing: expecting animated cards, dealer animating');
    }
    // TTS: 停止下注 (plays immediately, no conflict)
    if (phase === 'sealed' && prevPhaseRef.current !== 'sealed') {
      playSound('stopBets');
    }
    if (phase === 'betting') {
      // Check if result display is currently active (frozen state or still showing overlay)
      const resultDisplayActive = resultShownRef.current || frozenResult !== null || showResult;
      if (resultDisplayActive) {
        // Result still on screen — defer reset + sound until display finishes
        console.log('[Game] Phase→betting: result still displaying, deferring reset + sound');
        pendingResetRef.current = true;
        pendingPlaceBetsSoundRef.current = true;
      } else {
        // Result display already done (or never started) — reset immediately
        console.log('[Game] Phase→betting: resetting round state');
        if (prevPhaseRef.current !== 'betting') {
          playSound('placeBets');
        }
        doRoundReset();
      }
    }
    prevPhaseRef.current = phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, doRoundReset, playSound]);

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
        setDealerAnimating(false); // No dealer animation on reconnect
        // Show points and all card texts immediately on reconnect
        setDisplayPlayerPoints(playerPoints);
        setDisplayBankerPoints(bankerPoints);
        setAllFlipsDone(true);
        setRevealedPlayerCards(new Set(playerCards.map((_, i) => i)));
        setRevealedBankerCards(new Set(bankerCards.map((_, i) => i)));
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
    console.log(`[Game] Cards updated: player=${playerCards.length} banker=${bankerCards.length} expected=${expectedCardsRef.current} flipped=${flippedCountRef.current}`);
  }, [playerCards.length, bankerCards.length]);

  // Check if all flips are truly done (all cards dealt AND all flipped)
  const checkAllFlipsDone = useCallback(() => {
    console.log(`[Game] checkAllFlipsDone: lastResult=${lastResult} flipped=${flippedCountRef.current} expected=${expectedCardsRef.current}`);
    if (lastResult !== null && flippedCountRef.current >= expectedCardsRef.current) {
      console.log('[Game] ✅ ALL FLIPS DONE, stopping dealer animation');
      setAllFlipsDone(true);
      setDealerAnimating(false); // Stop dealer animation when all cards are flipped
    }
  }, [lastResult]);

  // When lastResult arrives (server done sending cards), re-check flip completion
  useEffect(() => {
    if (lastResult !== null) {
      console.log(`[Game] lastResult arrived: ${lastResult}, re-checking flips`);
      checkAllFlipsDone();
    }
  }, [lastResult, checkAllFlipsDone]);

  // Callback when a player card flip completes
  const onPlayerCardFlipped = useCallback((cardIndex: number) => {
    console.log(`[Game] 🃏 Player card ${cardIndex} flipped`);
    setRevealedPlayerCards(prev => new Set(prev).add(cardIndex));
    const revealedCards = playerCards.slice(0, cardIndex + 1);
    const pts = revealedCards.reduce((sum, c) => sum + c.value, 0) % 10;
    setDisplayPlayerPoints(pts);
    setPointsPulseKey(k => k + 1);
    flippedCountRef.current += 1;
    console.log(`[Game] Player flip done — flipped=${flippedCountRef.current} expected=${expectedCardsRef.current}`);
    checkAllFlipsDone();
  }, [playerCards, checkAllFlipsDone]);

  // Callback when a banker card flip completes
  const onBankerCardFlipped = useCallback((cardIndex: number) => {
    console.log(`[Game] 🃏 Banker card ${cardIndex} flipped`);
    setRevealedBankerCards(prev => new Set(prev).add(cardIndex));
    const revealedCards = bankerCards.slice(0, cardIndex + 1);
    const pts = revealedCards.reduce((sum, c) => sum + c.value, 0) % 10;
    setDisplayBankerPoints(pts);
    setPointsPulseKey(k => k + 1);
    flippedCountRef.current += 1;
    console.log(`[Game] Banker flip done — flipped=${flippedCountRef.current} expected=${expectedCardsRef.current}`);
    checkAllFlipsDone();
  }, [bankerCards, checkAllFlipsDone]);

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
  const betNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const currentCount = confirmedBets.length;
    const prevCount = prevConfirmedBetsRef.current;

    // Only show notification when bets are newly confirmed (count increased)
    if (currentCount > 0 && currentCount > prevCount && phase === 'betting') {
      playSound('betSuccessVoice');
      const total = confirmedBets.reduce((sum, b) => sum + b.amount, 0);
      setBetNotification({
        show: true,
        bets: confirmedBets.map(b => ({ type: b.type, amount: b.amount })),
        total,
      });

      // Clear any existing timer and start fresh 3s auto-hide
      if (betNotifTimerRef.current) clearTimeout(betNotifTimerRef.current);
      betNotifTimerRef.current = setTimeout(() => {
        setBetNotification(prev => ({ ...prev, show: false }));
        betNotifTimerRef.current = null;
      }, 3000);
    }

    prevConfirmedBetsRef.current = currentCount;
  }, [confirmedBets, phase]);

  // Reset notification reference when round changes
  useEffect(() => {
    prevConfirmedBetsRef.current = 0;
  }, [roundNumber]);

  // Phase display
  const phaseDisplay = getPhaseDisplay(phase, timeRemaining, t);

  // Handle bet click with flying chip animation
  const handlePlaceBet = (type: BetType, event?: React.MouseEvent) => {
    if (!canBet) return;
    const success = addPendingBet(type);
    if (success) {
      playSound('chipPlace');

      // Trigger flying chip animation
      if (event && chipSelectorRef.current) {
        const selectorRect = chipSelectorRef.current.getBoundingClientRect();
        const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

        // Start from chip selector center
        const startX = selectorRect.left + selectorRect.width / 2;
        const startY = selectorRect.top + selectorRect.height / 2;

        // End at bet area center
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;

        addFlyingChip(selectedChip, startX, startY, endX, endY);
      }
    }
  };

  // Handle confirm - send pending bets to server
  const handleConfirm = () => {
    if (pendingBets.length === 0) return;
    const result = submitBets(isNoCommission);
    if (!result.success && result.error) {
      // Show error notification
      setBetError({ show: true, message: result.error });
      // Auto-hide after 3 seconds
      setTimeout(() => setBetError({ show: false, message: '' }), 3000);
    }
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

  // Show result for exactly 3 seconds after all card flips complete.
  // Problem: result phase (5s) starts on the server when game:result is sent,
  // but card animations eat most of that time. Then when phase becomes 'betting',
  // resetForNewRound() sets lastResult=null which was killing the timer.
  // Fix: once triggered, the 3s timer runs to completion regardless of state changes.
  const [showResult, setShowResult] = useState(false);
  const showResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultShownRef = useRef(false); // prevent re-triggering within same round

  // Hold a snapshot of the entire display so it survives resetForNewRound clearing store data
  const [frozenResult, setFrozenResult] = useState<string | null>(null);
  const [frozenNetResult, setFrozenNetResult] = useState<number>(0);
  const [frozenPlayerCards, setFrozenPlayerCards] = useState<typeof playerCards>([]);
  const [frozenBankerCards, setFrozenBankerCards] = useState<typeof bankerCards>([]);
  const [frozenPlayerPoints, setFrozenPlayerPoints] = useState<number | null>(null);
  const [frozenBankerPoints, setFrozenBankerPoints] = useState<number | null>(null);
  // Frozen winning bet info for flash animation
  const [frozenWinningBets, setFrozenWinningBets] = useState<Set<string>>(new Set());

  // Accumulate session win/loss when a new settlement arrives
  useEffect(() => {
    if (lastSettlement && lastSettlement !== prevSettlementRef.current) {
      setSessionWinLoss(prev => prev + lastSettlement.netResult);
      prevSettlementRef.current = lastSettlement;
    }
  }, [lastSettlement]);

  useEffect(() => {
    console.log(`[Game] Result display check: lastResult=${lastResult} allFlipsDone=${allFlipsDone} resultShown=${resultShownRef.current} showResult=${showResult}`);
    if (lastResult !== null && allFlipsDone && !resultShownRef.current) {
      resultShownRef.current = true;
      // Freeze all display data before store gets reset
      setFrozenResult(lastResult);
      setFrozenNetResult(lastSettlement?.netResult || 0);
      setFrozenPlayerCards([...playerCards]);
      setFrozenBankerCards([...bankerCards]);
      setFrozenPlayerPoints(displayPlayerPoints);
      setFrozenBankerPoints(displayBankerPoints);

      // Calculate winning bet types for flash animation
      const winningBets = new Set<string>();
      const pPts = displayPlayerPoints ?? playerPoints ?? 0;
      const bPts = displayBankerPoints ?? bankerPoints ?? 0;
      const totalCards = playerCards.length + bankerCards.length;

      // Main result
      if (lastResult === 'player') winningBets.add('player');
      if (lastResult === 'banker') winningBets.add('banker');
      if (lastResult === 'tie') winningBets.add('tie');

      // Super 6: banker wins with 6 points
      if (lastResult === 'banker' && bPts === 6) winningBets.add('super_six');

      // Pair info from game:result event (stored in lastPlayerPair/lastBankerPair)
      if (lastPlayerPair) winningBets.add('player_pair');
      if (lastBankerPair) winningBets.add('banker_pair');

      // Dragon bonus: win by 4+ points margin (natural wins also count)
      if (lastResult === 'player' && (pPts - bPts) >= 4) winningBets.add('player_bonus');
      if (lastResult === 'banker' && (bPts - pPts) >= 4) winningBets.add('banker_bonus');

      // Big/Small: total cards
      if (totalCards === 4) winningBets.add('small');
      if (totalCards === 5 || totalCards === 6) winningBets.add('big');

      setFrozenWinningBets(winningBets);
      console.log(`[Game] ⏳ Starting 2s wait before showing result: ${lastResult} (froze ${playerCards.length}+${bankerCards.length} cards, winning: ${Array.from(winningBets).join(',')}, pairs: P=${lastPlayerPair} B=${lastBankerPair})`);
      showResultTimerRef.current = setTimeout(() => {
        console.log(`[Game] 🏆 Showing result overlay NOW`);
        // TTS: announce winner
        if (lastResult === 'player') playSound('playerWins');
        else if (lastResult === 'banker') playSound('bankerWins');
        else if (lastResult === 'tie') playSound('tie');
        setShowResult(true);
        showResultTimerRef.current = setTimeout(() => {
          console.log(`[Game] 🔚 Hiding result overlay after 2s display`);
          setShowResult(false);
          setFrozenResult(null);
          setFrozenNetResult(0);
          setFrozenPlayerCards([]);
          setFrozenBankerCards([]);
          setFrozenPlayerPoints(null);
          setFrozenBankerPoints(null);
          setFrozenWinningBets(new Set());
        }, 2000);
      }, 2000);
    }
  }, [lastResult, allFlipsDone, playSound, displayPlayerPoints, displayBankerPoints, playerPoints, bankerPoints, playerCards.length, bankerCards.length, lastPlayerPair, lastBankerPair]);

  // Use frozen data when store has been reset but we're still displaying result
  const renderPlayerCards = frozenResult !== null && playerCards.length === 0 ? frozenPlayerCards : playerCards;
  const renderBankerCards = frozenResult !== null && bankerCards.length === 0 ? frozenBankerCards : bankerCards;
  const renderPlayerPoints = frozenResult !== null && displayPlayerPoints === null ? frozenPlayerPoints : displayPlayerPoints;
  const renderBankerPoints = frozenResult !== null && displayBankerPoints === null ? frozenBankerPoints : displayBankerPoints;

  // Get winning flash class for bet buttons
  const getWinningFlashClass = (betType: string): string => {
    if (!showResult || !frozenWinningBets.has(betType)) return '';
    // Color based on bet type
    if (betType === 'player' || betType === 'player_pair' || betType === 'player_bonus') {
      return 'winning-flash winning-flash-player';
    }
    if (betType === 'banker' || betType === 'banker_pair' || betType === 'banker_bonus') {
      return 'winning-flash winning-flash-banker';
    }
    if (betType === 'tie') {
      return 'winning-flash winning-flash-tie';
    }
    // super_six, big, small use gold
    return 'winning-flash winning-flash-gold';
  };

  // When result display is fully done AND we're in betting phase, do the round reset + sound
  // This handles both cases:
  //   A) phase=betting arrived WHILE displaying → pendingResetRef was set
  //   B) display finished BEFORE phase=betting → phase effect will handle it directly
  useEffect(() => {
    if (frozenResult === null && !showResult) {
      if (resultShownRef.current) {
        console.log('[Game] 🔄 resultShownRef reset (frozenResult null)');
        resultShownRef.current = false;
      }
      if (phase === 'betting' && (pendingResetRef.current || lastResult !== null)) {
        console.log('[Game] 🔄 Result display done + betting phase active → reset + placeBets');
        doRoundReset();
        pendingPlaceBetsSoundRef.current = false;
        playSound('placeBets');
      }
    }
  }, [frozenResult, showResult, doRoundReset, playSound, phase, lastResult]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (showResultTimerRef.current) {
        clearTimeout(showResultTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full bg-[#1a1f2e] text-white flex flex-col overflow-hidden">
      {/* Loading screen */}
      <AnimatePresence>
        <GameLoadingScreen visible={!isConnected} />
      </AnimatePresence>

      {/* Flying chips overlay */}
      <FlyingChipOverlay chips={flyingChips} chipSize={32} />

      {/* Notice Marquee */}
      <NoticeMarquee />

      {/* Top Header Bar - Desktop only */}
      <header className="hidden lg:flex h-11 bg-[#0d1117] items-center justify-between px-2 sm:px-4 border-b border-gray-800/50">
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

        {/* Center - Balance (tablet) */}
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
              {/* Roadmap */}
              <button
                onClick={() => { setIsRoadmapOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <MapPin className="w-4 h-4" />
                <span>路單</span>
              </button>
              {/* Report */}
              <button
                onClick={() => { setIsReportOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <FileText className="w-4 h-4" />
                <span>報表</span>
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

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden lg:overflow-auto">
        {/* Left Sidebar - User & Session Info (hidden on mobile/tablet) */}
        <div className="hidden xl:flex w-60 bg-[#141922] border-r border-gray-800/50 flex-col shrink-0">
          {/* User Card */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {(user?.username || 'P')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base text-white font-bold">{user?.username || 'Player'}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400 font-bold text-xl">${balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bet Range */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-300 bg-black/30 rounded-lg py-2">
              <ArrowUpDown className="w-4 h-4 text-amber-400" />
              <span>
                {t('betRange')}: <span className="text-amber-400 font-bold">{bettingLimits
                  ? `${bettingLimits.player.min.toLocaleString()}-${(bettingLimits.player.max / 1000).toFixed(0)}K`
                  : '10-100K'}</span>
              </span>
            </div>
          </div>

          {/* Session Performance */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <span className="text-cyan-400 font-bold text-sm">{t('sessionStats')}</span>
            </div>

            {/* Big Win/Loss Display */}
            <div className="bg-gradient-to-br from-black/40 to-black/20 rounded-xl p-4 text-center mb-3">
              <div className="text-gray-400 text-xs mb-1">{t('sessionProfit')}</div>
              <div className={`text-3xl font-black ${sessionWinLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {sessionWinLoss >= 0 ? '+' : ''}{sessionWinLoss.toLocaleString()}
              </div>
            </div>

            {/* Session Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{confirmedBets.reduce((s, b) => s + b.amount, 0).toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">{t('currentBet')}</div>
              </div>
              <div className="bg-black/20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{roadmapData.length}</div>
                <div className="text-[10px] text-gray-500">{t('shoeRounds')}</div>
              </div>
            </div>
          </div>

          {/* Betting History */}
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="text-purple-400 font-bold text-sm">{t('recentBets')}</span>
            </div>

            {/* Recent bet results - show last 5 settlements */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {lastSettlement && (
                <div className={`p-3 rounded-lg ${lastSettlement.netResult >= 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{t('lastRound')}</span>
                    <span className={`font-bold ${lastSettlement.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {lastSettlement.netResult >= 0 ? '+' : ''}{lastSettlement.netResult.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {lastSettlement.bets.map((bet, i) => (
                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${bet.won ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-400'}`}>
                        {bet.type === 'player' ? '閒' : bet.type === 'banker' ? '莊' : bet.type === 'tie' ? '和' : bet.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!lastSettlement && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {t('noBetsYet')}
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="mt-3 p-3 bg-gradient-to-br from-amber-500/10 to-transparent rounded-lg border border-amber-500/20">
              <div className="text-amber-400 text-xs font-bold mb-1">💡 {t('tip')}</div>
              <div className="text-[11px] text-gray-400 leading-relaxed">
                {(() => {
                  const tips = [
                    '莊家優勢約 1.06%，閒家約 1.24%',
                    '和牌賠率雖高，但莊閒優勢更穩',
                    '設定止損點，理性投注',
                    '觀察路單趨勢，把握節奏',
                  ];
                  return tips[Math.floor(roadmapData.length / 3) % tips.length];
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Center - Game Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          {/* Countdown timer — positioned over entire game area (above dealer + table) */}
          <CountdownTimer timeRemaining={timeRemaining} phase={phase} hidden={lastResult !== null || frozenResult !== null || showResult} />

          {/* Video Area - 3D Dealer Table */}
          <DealerTable3D
            isDealing={dealerAnimating}
            dealerName={currentDealerName}
            gameType="baccarat"
            dealerModel={dealerModelForTable}
            isShuffling={isShuffling}
          >

              {/* Top info bar */}
              {/* Desktop only: Game info bar */}
              <div className="hidden sm:flex relative z-10 items-center justify-center pt-2 pb-1">
                <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-1 border border-[#d4af37]/10">
                  <span className="text-[11px] text-[#d4af37]/70 font-mono">{t('baccarat')} {shoeNumber}</span>
                  <span className="text-[#d4af37]/20">|</span>
                  <span className={`text-[11px] font-bold ${phaseDisplay.color}`}>{roundNumber} — {phaseDisplay.text}</span>
                </div>
              </div>

              {/* Main dealing area — cards fly from dealer's hand above */}
              <div className="flex-1 relative flex items-start sm:items-center justify-center mt-[5%] sm:mt-0 pt-1 sm:pt-0">
                {/* Player & Banker zones */}
                <div ref={cardAreaRef} className="flex items-stretch gap-1 sm:gap-8 lg:gap-16 xl:gap-24">
                  {/* ——— PLAYER ZONE ——— */}
                  <div className="flex flex-col items-center">
                    {/* Player header + score */}
                    <div className="flex items-center gap-0.5 mb-1 sm:gap-3 sm:mb-4">
                      <div className="bg-blue-600 text-white text-base px-2.5 py-1 sm:text-xl sm:px-5 sm:py-2 rounded-l font-bold tracking-wide">
                        閒
                      </div>
                      <div key={`pp-${pointsPulseKey}`} className={`bg-black/60 text-white text-2xl px-3 py-1 min-w-[36px] sm:text-5xl sm:px-6 sm:py-2 sm:min-w-[80px] rounded-r font-bold text-center border border-blue-500/20 ${renderPlayerPoints !== null ? 'points-pulse' : ''}`}>
                        {renderPlayerPoints ?? '-'}
                      </div>
                    </div>
                    {/* Third card — rotated 90° */}
                    <div style={{ height: thirdCardHeight }}>
                      {renderPlayerCards.length > 2 && (
                        <div className="mb-0.5 sm:mb-3">
                          <AnimatedPlayingCard
                            card={renderPlayerCards[2]}
                            size={cardSize}
                            flyFrom={{ x: 0, y: thirdFlyY }}
                            flyDelay={3.5}
                            flipDelay={0.5}
                            rotation={90}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onPlayerCardFlipped(2)}
                          />
                        </div>
                      )}
                    </div>
                    {/* First two cards */}
                    <div className="flex gap-1 sm:gap-3">
                      {renderPlayerCards.length > 0 && (
                        renderPlayerCards.slice(0, 2).map((card, i) => (
                          <AnimatedPlayingCard
                            key={`player-${i}-${card.rank}-${card.suit}`}
                            card={card}
                            size={cardSize}
                            flyFrom={{ x: flyX, y: flyY }}
                            flyDelay={i * 1.2}
                            flipDelay={0.5}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onPlayerCardFlipped(i)}
                          />
                        ))
                      )}
                    </div>
                    {/* Card text preview */}
                    <div className="mt-0.5 sm:mt-3 flex gap-1 sm:gap-2 text-[8px] sm:text-base font-mono text-blue-300/60">
                      {renderPlayerCards.length > 0 ? renderPlayerCards.map((c, i) => (
                        <span key={i} className={`transition-opacity duration-300 ${revealedPlayerCards.has(i) ? 'opacity-100' : 'opacity-0'} ${c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-red-400/60' : ''}`}>
                          {SUIT_SYMBOLS[c.suit]}{c.rank}
                        </span>
                      )) : <span className="text-gray-600">--</span>}
                    </div>
                  </div>

                  {/* ——— Center VS ——— */}
                  <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-2 px-0.5 sm:px-2 lg:px-4">
                    <div className="w-px h-4 sm:h-12 lg:h-20 bg-gradient-to-b from-transparent via-[#d4af37]/25 to-transparent" />
                    <div className="text-[10px] sm:text-xl lg:text-2xl text-[#d4af37]/30 font-bold">VS</div>
                    <div className="w-px h-4 sm:h-12 lg:h-20 bg-gradient-to-b from-transparent via-[#d4af37]/25 to-transparent" />
                  </div>

                  {/* ——— BANKER ZONE ——— */}
                  <div className="flex flex-col items-center">
                    {/* Banker header + score */}
                    <div className="flex items-center gap-0.5 mb-1 sm:gap-3 sm:mb-4">
                      <div key={`bp-${pointsPulseKey}`} className={`bg-black/60 text-white text-2xl px-3 py-1 min-w-[36px] sm:text-5xl sm:px-6 sm:py-2 sm:min-w-[80px] rounded-l font-bold text-center border border-red-500/20 ${renderBankerPoints !== null ? 'points-pulse' : ''}`}>
                        {renderBankerPoints ?? '-'}
                      </div>
                      <div className="bg-red-600 text-white text-base px-2.5 py-1 sm:text-xl sm:px-5 sm:py-2 rounded-r font-bold tracking-wide">
                        莊
                      </div>
                    </div>
                    {/* Third card — rotated 90° */}
                    <div style={{ height: thirdCardHeight }}>
                      {renderBankerCards.length > 2 && (
                        <div className="mb-0.5 sm:mb-3">
                          <AnimatedPlayingCard
                            card={renderBankerCards[2]}
                            size={cardSize}
                            flyFrom={{ x: 0, y: thirdFlyY }}
                            flyDelay={4.5}
                            flipDelay={0.5}
                            rotation={90}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onBankerCardFlipped(2)}
                          />
                        </div>
                      )}
                    </div>
                    {/* First two cards */}
                    <div className="flex gap-1 sm:gap-3">
                      {renderBankerCards.length > 0 && (
                        renderBankerCards.slice(0, 2).map((card, i) => (
                          <AnimatedPlayingCard
                            key={`banker-${i}-${card.rank}-${card.suit}`}
                            card={card}
                            size={cardSize}
                            flyFrom={{ x: -flyX, y: flyY }}
                            flyDelay={0.6 + i * 1.2}
                            flipDelay={0.5}
                            skipAnimation={skipCardAnim}
                            onFlipComplete={() => onBankerCardFlipped(i)}
                          />
                        ))
                      )}
                    </div>
                    {/* Card text preview */}
                    <div className="mt-0.5 sm:mt-3 flex gap-1 sm:gap-2 text-[8px] sm:text-base font-mono text-red-300/60">
                      {renderBankerCards.length > 0 ? renderBankerCards.map((c, i) => (
                        <span key={i} className={`transition-opacity duration-300 ${revealedBankerCards.has(i) ? 'opacity-100' : 'opacity-0'} ${c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-red-400/60' : ''}`}>
                          {SUIT_SYMBOLS[c.suit]}{c.rank}
                        </span>
                      )) : <span className="text-gray-600">--</span>}
                    </div>
                  </div>
                </div>

                {/* Result Overlay */}
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
                          frozenResult === 'player' ? 'text-blue-400' :
                          frozenResult === 'banker' ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {frozenResult === 'player' ? t('playerWins') :
                           frozenResult === 'banker' ? t('bankerWins') : t('tieResult')}
                        </div>
                        {frozenNetResult !== 0 && (
                          <div className={`text-xl sm:text-2xl font-bold ${frozenNetResult > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {frozenNetResult > 0 ? '+' : ''}{frozenNetResult.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

          </DealerTable3D>

          {/* Fake bet stats — positioned on table area for desktop, below countdown for mobile */}
          <div className="absolute top-[90px] sm:top-[94px] lg:top-[22%] left-2 sm:left-3 lg:left-4 z-50 pointer-events-none">
            <FakeBetStats fakeBets={fakeAmounts} gameType="baccarat" size="large" />
          </div>

          {/* Virtual Players Bar - row of fake players at table bottom */}
          <VirtualPlayersBar tableId={tableId || 'default'} />

          {/* Marquee chat - flying messages (outside DealerTable3D for proper positioning) */}
          <MarqueeChat
            username={user?.username || '玩家'}
            showButtons={true}
            sendMessage={sendMarqueeMessage}
            cooldown={marqueeCooldown}
            messages={[...marqueeMessages, ...fakeBroadcasts]}
            removeMessage={(id) => {
              // Try to remove from user messages first, then from fake broadcasts
              removeMarqueeMessage(id);
              removeFakeBroadcast(id);
            }}
          />

          {/* Betting Panel */}
          <div className="bg-[#0d1117] lg:flex-none flex-1 flex flex-col">
            {/* Quick Message Buttons - Desktop only, above Control Bar */}
            <div className="hidden lg:flex items-center gap-1 px-2 sm:px-4 py-1.5 border-b border-gray-800/30 bg-black/30">
              <span className="text-[10px] text-gray-500 mr-2">廣播:</span>
              <MarqueeQuickButtons sendMessage={sendMarqueeMessage} cooldown={marqueeCooldown} />
            </div>

            {/* Control Bar - Hidden on mobile */}
            <div className="hidden lg:flex flex-wrap sm:flex-nowrap items-center justify-between px-2 sm:px-4 py-2 gap-2 border-b border-gray-800/50">
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
                <button
                  onClick={() => setIsGiftOpen(true)}
                  className="text-xs text-orange-400 hover:text-orange-300"
                >{t('gifts')}</button>
              </div>
            </div>

            {/* Betting Areas - Casino Felt Surface */}
            <div className="flex flex-col lg:flex-row lg:items-stretch lg:h-[360px] casino-betting-surface border-t-2 border-[#d4af37]/40">
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
                  {/* Sliding window by column: when data exceeds TOTAL, hide leftmost column */}
                  <div className="flex-1 grid grid-cols-5 grid-rows-6 gap-px" style={{ backgroundColor: '#D1D5DB' }}>
                    {(() => {
                      const ROWS = 6;
                      const COLS = 5;
                      const TOTAL = ROWS * COLS; // 30 cells
                      const hasAskRoad = askRoadMode !== 'none';

                      // Calculate total items to display (data + optional prediction)
                      const dataCount = roadmapData.length;
                      const totalItems = dataCount + (hasAskRoad ? 1 : 0);

                      // Calculate how many columns we need
                      const neededCols = Math.ceil(totalItems / ROWS);

                      // Calculate offset: how many columns to skip (slide left)
                      const skipCols = Math.max(0, neededCols - COLS);
                      const skipItems = skipCols * ROWS;

                      // Get the visible data
                      const visibleData = roadmapData.slice(skipItems);

                      const cells: ({ data: typeof roadmapData[0] | null; predicted?: boolean })[] = Array(TOTAL).fill(null).map(() => ({ data: null }));

                      // Fill column by column
                      for (let i = 0; i < visibleData.length; i++) {
                        const col = Math.floor(i / ROWS);
                        const row = i % ROWS;
                        if (col < COLS) {
                          cells[row * COLS + col] = { data: visibleData[i] };
                        }
                      }

                      // Add ask road prediction at the next available position
                      if (hasAskRoad) {
                        const predIdx = visibleData.length;
                        const predCol = Math.floor(predIdx / ROWS);
                        const predRow = predIdx % ROWS;
                        if (predCol < COLS) {
                          const cellIdx = predRow * COLS + predCol;
                          cells[cellIdx] = {
                            data: { result: askRoadMode as GameResult, playerPair: false, bankerPair: false, roundNumber: '', playerPoints: 0, bankerPoints: 0, totalCards: 0 },
                            predicted: true,
                          };
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
              <div className="flex-1 flex flex-col border-l border-r border-[#d4af37]/30">
                {/* Top Row - Side bets (5 buttons) */}
                <div className="flex flex-wrap lg:flex-nowrap h-auto lg:h-[95px] border-b border-[#d4af37]/30">
                  {/* 閒龍寶 - Player Dragon Bonus */}
                  <button
                    onClick={(e) => handlePlaceBet('player_bonus', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-player relative flex-1 min-w-[40px] py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('player_bonus') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('player_bonus')}`}
                  >
                    <span className="text-blue-300 text-[10px] sm:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('playerBonus')}</span>
                    <span className="text-[#d4af37] text-[9px] sm:text-xs font-semibold">1:30</span>
                    {getBetAmount('player_bonus') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-1 py-px rounded-full shadow z-10">{getBetAmount('player_bonus')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('player_bonus')} chipSize={14} maxChips={2} stackOffset={1} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.player_bonus || 0) > 0 && (
                      <div className="absolute bottom-0 left-0.5"><FakeChipStack amount={fakeAmounts.player_bonus} compact /></div>
                    )}
                  </button>

                  {/* 閒對 - Player Pair */}
                  <button
                    onClick={(e) => handlePlaceBet('player_pair', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-pair relative flex-1 min-w-[40px] py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('player_pair') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('player_pair')}`}
                  >
                    <span className="text-blue-300 text-[10px] sm:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('playerPair')}</span>
                    <span className="text-[#d4af37] text-[10px] sm:text-sm font-bold">1:11</span>
                    {getBetAmount('player_pair') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-1 py-px rounded-full shadow z-10">{getBetAmount('player_pair')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('player_pair')} chipSize={14} maxChips={2} stackOffset={1} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.player_pair || 0) > 0 && (
                      <div className="absolute bottom-0 left-0.5"><FakeChipStack amount={fakeAmounts.player_pair} compact /></div>
                    )}
                  </button>

                  {/* Super 6 */}
                  <button
                    onClick={(e) => handlePlaceBet('super_six', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-super6 relative flex-1 min-w-[40px] py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('super_six') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('super_six')}`}
                  >
                    <span className="text-purple-300 text-[8px] sm:text-[10px] font-bold tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">SUPER</span>
                    <span className="text-purple-200 text-base sm:text-3xl font-black leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">6</span>
                    <span className="text-[#d4af37] text-[8px] sm:text-[10px] font-semibold">1:12/1:20</span>
                    {getBetAmount('super_six') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-1 py-px rounded-full shadow z-10">{getBetAmount('super_six')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('super_six')} chipSize={14} maxChips={2} stackOffset={1} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.super_six || 0) > 0 && (
                      <div className="absolute bottom-0 left-0.5"><FakeChipStack amount={fakeAmounts.super_six} compact /></div>
                    )}
                  </button>

                  {/* 莊對 - Banker Pair */}
                  <button
                    onClick={(e) => handlePlaceBet('banker_pair', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-pair relative flex-1 min-w-[40px] py-0.5 lg:py-0 flex flex-col items-center justify-center border-r border-b lg:border-b-0 border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('banker_pair') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('banker_pair')}`}
                  >
                    <span className="text-red-300 text-[10px] sm:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('bankerPair')}</span>
                    <span className="text-[#d4af37] text-[10px] sm:text-sm font-bold">1:11</span>
                    {getBetAmount('banker_pair') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-1 py-px rounded-full shadow z-10">{getBetAmount('banker_pair')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('banker_pair')} chipSize={14} maxChips={2} stackOffset={1} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.banker_pair || 0) > 0 && (
                      <div className="absolute bottom-0 left-0.5"><FakeChipStack amount={fakeAmounts.banker_pair} compact /></div>
                    )}
                  </button>

                  {/* 莊龍寶 - Banker Dragon Bonus */}
                  <button
                    onClick={(e) => handlePlaceBet('banker_bonus', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-banker relative flex-1 min-w-[40px] py-0.5 lg:py-0 flex flex-col items-center justify-center border-b lg:border-b-0 border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('banker_bonus') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('banker_bonus')}`}
                  >
                    <span className="text-red-300 text-[10px] sm:text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t('bankerBonus')}</span>
                    <span className="text-[#d4af37] text-[9px] sm:text-xs font-semibold">1:30</span>
                    {getBetAmount('banker_bonus') > 0 && (
                      <>
                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-1 py-px rounded-full shadow z-10">{getBetAmount('banker_bonus')}</div>
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('banker_bonus')} chipSize={14} maxChips={2} stackOffset={1} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.banker_bonus || 0) > 0 && (
                      <div className="absolute bottom-0 left-0.5"><FakeChipStack amount={fakeAmounts.banker_bonus} compact /></div>
                    )}
                  </button>
                </div>

                {/* Main Row - 閒 / 和 / 莊 (large buttons with gold trim) */}
                <div className="flex flex-1">
                  {/* 閒 - Player (Blue) */}
                  <button
                    onClick={(e) => handlePlaceBet('player', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-player relative flex-[2] py-1 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('player') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('player')}`}
                  >
                    {/* Corner ornaments */}
                    <div className="casino-corner-ornament top-left hidden sm:block" />
                    <div className="casino-corner-ornament bottom-right hidden sm:block" />
                    <span className="casino-display text-blue-300 text-3xl sm:text-4xl lg:text-5xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('player')}</span>
                    <span className="text-[#d4af37] text-sm sm:text-lg lg:text-xl font-bold">1:1</span>
                    {getBetAmount('player') > 0 && (
                      <>
                        <div className="absolute top-0.5 right-0.5 sm:top-3 sm:right-3 bg-[#d4af37] text-black text-xs sm:text-sm font-bold px-1.5 py-0.5 rounded-full shadow-lg z-10">{getBetAmount('player')}</div>
                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('player')} chipSize={20} maxChips={3} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.player || 0) > 0 && (
                      <div className="absolute bottom-0.5 left-1 sm:bottom-1 sm:left-2"><FakeChipStack amount={fakeAmounts.player} /></div>
                    )}
                  </button>

                  {/* 和 - Tie (Green) */}
                  <button
                    onClick={(e) => handlePlaceBet('tie', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-tie relative flex-[1.2] py-1 sm:py-6 lg:py-0 flex flex-col items-center justify-center border-r border-[#d4af37]/30 transition disabled:opacity-50 ${getBetAmount('tie') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('tie')}`}
                  >
                    <span className="casino-display text-green-300 text-3xl sm:text-4xl lg:text-5xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('tie')}</span>
                    <span className="text-[#d4af37] text-sm sm:text-lg lg:text-xl font-bold">1:8</span>
                    {getBetAmount('tie') > 0 && (
                      <>
                        <div className="absolute top-0.5 right-0.5 sm:top-3 sm:right-3 bg-[#d4af37] text-black text-xs sm:text-sm font-bold px-1.5 py-0.5 rounded-full shadow-lg z-10">{getBetAmount('tie')}</div>
                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('tie')} chipSize={20} maxChips={3} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.tie || 0) > 0 && (
                      <div className="absolute bottom-0.5 left-1 sm:bottom-1 sm:left-2"><FakeChipStack amount={fakeAmounts.tie} /></div>
                    )}
                  </button>

                  {/* 莊 - Banker (Red) */}
                  <button
                    onClick={(e) => handlePlaceBet('banker', e)}
                    disabled={!canBet}
                    className={`casino-bet-spot casino-bet-banker relative flex-[2] py-1 sm:py-6 lg:py-0 flex flex-col items-center justify-center transition disabled:opacity-50 ${getBetAmount('banker') > 0 ? 'has-bet' : ''} ${getWinningFlashClass('banker')}`}
                  >
                    {/* Corner ornaments */}
                    <div className="casino-corner-ornament top-right hidden sm:block" />
                    <div className="casino-corner-ornament bottom-left hidden sm:block" />
                    <span className="casino-display text-red-300 text-3xl sm:text-4xl lg:text-5xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('banker')}</span>
                    <span className="text-[#d4af37] text-sm sm:text-lg lg:text-xl font-bold">
                      {isNoCommission ? '1:1' : '1:0.95'}
                    </span>
                    {isNoCommission && (
                      <span className="text-[#d4af37]/70 text-[9px] sm:text-xs">(6點贏 1:0.5)</span>
                    )}
                    {getBetAmount('banker') > 0 && (
                      <>
                        <div className="absolute top-0.5 right-0.5 sm:top-3 sm:right-3 bg-[#d4af37] text-black text-xs sm:text-sm font-bold px-1.5 py-0.5 rounded-full shadow-lg z-10">{getBetAmount('banker')}</div>
                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={getBetAmount('banker')} chipSize={20} maxChips={3} />
                        </div>
                      </>
                    )}
                    {(fakeAmounts.banker || 0) > 0 && (
                      <div className="absolute bottom-0.5 left-1 sm:bottom-1 sm:left-2"><FakeChipStack amount={fakeAmounts.banker} /></div>
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
                      small={false}
                    />
                  ))}
                  <button
                    onClick={() => setIsChipSettingsOpen(true)}
                    className="relative rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 border-2 border-white/20 shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 w-14 h-14"
                    title={t('chipSettings') || '籌碼設置'}
                  >
                    <Coins className="relative z-10 text-white drop-shadow-lg w-6 h-6" />
                  </button>
                </div>

                {/* Mobile: Two rows - Chips on top, Balance/Actions on bottom */}
                <div ref={!chipSelectorRef.current ? chipSelectorRef : undefined} className="lg:hidden bg-[#1a1f2e]">
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

                  {/* Row 2: Balance + No Commission + Actions */}
                  <div className="flex items-center justify-between py-1 px-2 border-t border-gray-700/50">
                    {/* Left: Balance Info */}
                    <div className="flex items-center gap-3 text-[9px]">
                      <span className="text-gray-400">餘額 <span className="text-yellow-400 font-bold">{balance.toLocaleString()}</span></span>
                      <span className="text-gray-400">下注 <span className="text-white font-bold">{totalBet.toLocaleString()}</span></span>
                      <span className="text-gray-400">輸贏 <span className={`font-bold ${sessionWinLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{sessionWinLoss.toLocaleString()}</span></span>
                    </div>

                    {/* Right: No Commission + Actions */}
                    <div className="flex items-center gap-1">
                      {/* No Commission Toggle */}
                      <button
                        onClick={() => setIsNoCommission(!isNoCommission)}
                        className={`px-2 py-0.5 text-[9px] rounded transition ${
                          isNoCommission
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        免佣 {isNoCommission ? '開' : '關'}
                      </button>

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
                <div className="flex-1 p-1 overflow-x-auto" style={{ backgroundColor: '#FFFFFF' }}>
                  <div className="grid grid-rows-6 gap-px h-full" style={{ backgroundColor: '#D1D5DB', gridTemplateColumns: `repeat(${BIG_ROAD_DISPLAY_COLS}, minmax(16px, 1fr))`, minWidth: `${BIG_ROAD_DISPLAY_COLS * 16}px` }}>
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

                {/* Three Derived Roads - side by side (2x2 mini-cells per grid cell) */}
                <div className="flex h-[54px] border-t border-gray-400">
                  {/* Big Eye Boy - hollow circles */}
                  <div className="flex-1 border-r border-gray-400">
                    <DerivedRoadGrid
                      data={askRoadMode !== 'none' ? (askRoadMode === 'banker' ? bankerAskRoad.bigEye : playerAskRoad.bigEye) : bigEyeBoyDataFull}
                      type="big_eye"
                      predictedCount={askRoadMode !== 'none' ? ((askRoadMode === 'banker' ? bankerAskRoad.bigEye : playerAskRoad.bigEye).length - bigEyeBoyDataFull.length) : 0}
                    />
                  </div>

                  {/* Small Road - filled circles */}
                  <div className="flex-1 border-r border-gray-400">
                    <DerivedRoadGrid
                      data={askRoadMode !== 'none' ? (askRoadMode === 'banker' ? bankerAskRoad.smallRoad : playerAskRoad.smallRoad) : smallRoadDataFull}
                      type="small"
                      predictedCount={askRoadMode !== 'none' ? ((askRoadMode === 'banker' ? bankerAskRoad.smallRoad : playerAskRoad.smallRoad).length - smallRoadDataFull.length) : 0}
                    />
                  </div>

                  {/* Cockroach Pig - slashes */}
                  <div className="flex-1">
                    <DerivedRoadGrid
                      data={askRoadMode !== 'none' ? (askRoadMode === 'banker' ? bankerAskRoad.cockroach : playerAskRoad.cockroach) : cockroachDataFull}
                      type="cockroach"
                      predictedCount={askRoadMode !== 'none' ? ((askRoadMode === 'banker' ? bankerAskRoad.cockroach : playerAskRoad.cockroach).length - cockroachDataFull.length) : 0}
                    />
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

            {/* Mobile Roadmap Section - Only visible on mobile/tablet */}
            <div className="lg:hidden bg-[#0d1117]">
              <div className="flex h-[140px] sm:h-[148px] sm:pb-14">
                {/* Roadmap */}
                <div className="flex-1 overflow-hidden">
                  <LobbyRoadmap roadHistory={(() => {
                    const base = roadmapData.map(r => ({
                      result: r.result,
                      playerPair: r.playerPair || false,
                      bankerPair: r.bankerPair || false,
                    }));
                    if (askRoadMode !== 'none') {
                      base.push({ result: askRoadMode as 'banker' | 'player', playerPair: false, bankerPair: false });
                    }
                    return base;
                  })()} predictedCount={askRoadMode !== 'none' ? 1 : 0} />
                </div>
                {/* Stats Panel */}
                <div className="shrink-0 w-[55px] h-full flex flex-col justify-center px-1.5 py-1 text-[8px] border-l border-gray-700/50" style={{ backgroundColor: '#1e2433' }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-red-500">莊</span>
                    <span className="text-white font-medium">{bankerWins}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-blue-500">閒</span>
                    <span className="text-white font-medium">{playerWins}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-green-500">和</span>
                    <span className="text-white font-medium">{ties}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-gray-600 pt-0.5 mt-0.5">
                    <span className="text-gray-400">總數</span>
                    <span className="text-white font-medium">{total}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-gray-600 pt-0.5 mt-0.5">
                    <button
                      onClick={() => setAskRoadMode(prev => prev === 'banker' ? 'none' : 'banker')}
                      className={`text-red-500 ${askRoadMode === 'banker' ? 'underline font-bold' : ''}`}
                    >莊問路</button>
                    <div className="flex items-center gap-0.5">
                      {(() => {
                        const be = bankerAskRoad.bigEye.slice(bigEyeBoyDataFull.length);
                        const sr = bankerAskRoad.smallRoad.slice(smallRoadDataFull.length);
                        const cp = bankerAskRoad.cockroach.slice(cockroachDataFull.length);
                        const beC = be.length > 0 ? be[be.length - 1] : null;
                        const srC = sr.length > 0 ? sr[sr.length - 1] : null;
                        const cpC = cp.length > 0 ? cp[cp.length - 1] : null;
                        return (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ border: `1px solid ${beC === 'red' ? '#ef4444' : beC === 'blue' ? '#3b82f6' : '#666'}` }} />
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: srC === 'red' ? '#ef4444' : srC === 'blue' ? '#3b82f6' : '#666' }} />
                            <div style={{ width: 5, height: 1.5, backgroundColor: cpC === 'red' ? '#ef4444' : cpC === 'blue' ? '#3b82f6' : '#666', transform: 'rotate(-45deg)' }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => setAskRoadMode(prev => prev === 'player' ? 'none' : 'player')}
                      className={`text-blue-500 ${askRoadMode === 'player' ? 'underline font-bold' : ''}`}
                    >閒問路</button>
                    <div className="flex items-center gap-0.5">
                      {(() => {
                        const be = playerAskRoad.bigEye.slice(bigEyeBoyDataFull.length);
                        const sr = playerAskRoad.smallRoad.slice(smallRoadDataFull.length);
                        const cp = playerAskRoad.cockroach.slice(cockroachDataFull.length);
                        const beC = be.length > 0 ? be[be.length - 1] : null;
                        const srC = sr.length > 0 ? sr[sr.length - 1] : null;
                        const cpC = cp.length > 0 ? cp[cp.length - 1] : null;
                        return (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ border: `1px solid ${beC === 'red' ? '#ef4444' : beC === 'blue' ? '#3b82f6' : '#666'}` }} />
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: srC === 'red' ? '#ef4444' : srC === 'blue' ? '#3b82f6' : '#666' }} />
                            <div style={{ width: 5, height: 1.5, backgroundColor: cpC === 'red' ? '#ef4444' : cpC === 'blue' ? '#3b82f6' : '#666', transform: 'rotate(-45deg)' }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
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
            <div className="mt-2">
              <button
                onClick={() => setIsTableSwitchOpen(true)}
                className="w-full text-xs py-1 bg-[#1e2a3a] rounded text-gray-300 hover:bg-[#2a3a4a] transition"
              >
                {t('switchTable')}
              </button>
            </div>
          </div>

          {/* Stats Panel with Progress Bars */}
          <div className="p-3 border-b border-gray-800/50">
            {/* Total Rounds */}
            <div className="text-center mb-3">
              <span className="text-gray-500 text-[10px]">總局數</span>
              <div className="text-xl font-bold text-white">{total}</div>
            </div>

            {/* Main Results with Progress Bars */}
            <div className="space-y-2 mb-3">
              {/* Banker */}
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-red-400 font-medium">莊</span>
                  <span className="text-white">{bankerWins} ({total > 0 ? Math.round((bankerWins / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (bankerWins / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Player */}
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-blue-400 font-medium">閒</span>
                  <span className="text-white">{playerWins} ({total > 0 ? Math.round((playerWins / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (playerWins / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Tie */}
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-green-400 font-medium">和</span>
                  <span className="text-white">{ties} ({total > 0 ? Math.round((ties / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (ties / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] pt-2 border-t border-gray-700/50">
              <div className="flex justify-between">
                <span className="text-blue-300">閒對</span>
                <span className="text-white">{playerPairCount} ({total > 0 ? Math.round((playerPairCount / total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-300">莊對</span>
                <span className="text-white">{bankerPairCount} ({total > 0 ? Math.round((bankerPairCount / total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-400">小</span>
                <span className="text-white">{smallCount} ({total > 0 ? Math.round((smallCount / total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400">大</span>
                <span className="text-white">{bigCount} ({total > 0 ? Math.round((bigCount / total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300">閒龍寶</span>
                <span className="text-white">{pBonusCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-300">莊龍寶</span>
                <span className="text-white">{bBonusCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">超級6</span>
                <span className="text-white">{super6Count}</span>
              </div>
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
      <RoadmapModal isOpen={isRoadmapOpen} onClose={() => setIsRoadmapOpen(false)} data={roadmapData} />
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

      {/* Bet Error Notification Toast (Limit Validation) */}
      <AnimatePresence>
        {betError.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-16 left-1/2 z-[100] bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-3 rounded-lg shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1">下注失敗</div>
                <div className="text-xs">{betError.message}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation - Only shown on tablet/larger mobile, hidden on small phones where we use inline controls */}
      <div className="hidden sm:block lg:hidden">
        <MobileNavBar
          className=""
          variant="game"
          totalBet={totalBet}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onRepeat={handleRepeat}
          canBet={canBet}
          hasBets={pendingBets.length > 0}
          hasLastBets={lastBets.length > 0}
          menuActions={[
            { icon: <MapPin className="w-5 h-5" />, label: t('roadmap') || '路單', onClick: () => setIsRoadmapOpen(true), color: 'text-amber-400' },
            { icon: <Heart className="w-5 h-5" />, label: t('followingList'), onClick: () => setIsFollowingOpen(true), color: 'text-pink-400' },
            { icon: <FileText className="w-5 h-5" />, label: t('gameReport'), onClick: () => setIsReportOpen(true) },
            { icon: <Settings className="w-5 h-5" />, label: t('gameSettings'), onClick: () => setIsSettingsOpen(true) },
            { icon: <HelpCircle className="w-5 h-5" />, label: t('gameRules'), onClick: () => setIsRulesOpen(true) },
            { icon: <Coins className="w-5 h-5" />, label: t('chipSettings') || '籌碼設定', onClick: () => setIsChipSettingsOpen(true) },
          ]}
        />
      </div>
    </div>
  );
}
