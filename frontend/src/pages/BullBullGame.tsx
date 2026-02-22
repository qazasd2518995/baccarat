import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  HelpCircle,
  X,
  RotateCcw,
  Check,
  Wifi,
  WifiOff,
  CheckCircle,
  Volume2,
  VolumeX,
  Music,
  Music2,
} from 'lucide-react';
import { MobileNavBar } from '../components/layout/MobileNavBar';
import { useBullBullStore, type BullBullBetType, CHIP_VALUES, RANK_NAMES } from '../store/bullBullStore';
import { useBullBullSocket } from '../hooks/useBullBullSocket';
import { useTTS } from '../hooks/useTTS';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import PlayingCard from '../components/game/PlayingCard';
import AnimatedPlayingCard from '../components/game/AnimatedPlayingCard';
import CasinoChip, { formatChipValue } from '../components/game/CasinoChip';
import CountdownTimer from '../components/game/CountdownTimer';
import DealerTable3D from '../components/game/DealerTable3D';
import { formatAmount } from '../utils/format';

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

// Hand display component with dealing + reveal animations
function HandDisplay({
  position,
  hand,
  result,
  isBanker = false,
  betAmount,
  fakeBetAmount = 0,
  onBet,
  canBet,
  dealCount,
  isRevealed,
  revealDelay,
  skipAnimation,
}: {
  position: string;
  hand: { cards: any[]; rank: string; rankName: string } | null;
  result?: 'win' | 'lose' | null;
  isBanker?: boolean;
  betAmount: number;
  fakeBetAmount?: number;
  onBet: () => void;
  canBet: boolean;
  dealCount: number;
  isRevealed: boolean;
  revealDelay: number;
  skipAnimation: boolean;
}) {
  const bgColor = isBanker
    ? 'from-yellow-900/50 to-yellow-950/50 border-yellow-600'
    : result === 'win'
      ? 'from-green-900/50 to-green-950/50 border-green-500'
      : result === 'lose'
        ? 'from-red-900/50 to-red-950/50 border-red-500'
        : 'from-blue-900/50 to-blue-950/50 border-blue-600';

  const isHighRank = hand?.rank === 'five_face' || hand?.rank === 'bull_bull';

  return (
    <div
      className={`relative p-4 rounded-xl bg-gradient-to-b border-2 ${bgColor} ${
        canBet && !isBanker ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''
      }`}
      onClick={canBet && !isBanker ? onBet : undefined}
    >
      {/* Position label */}
      <div className="text-center mb-2">
        <span className={`font-bold ${isBanker ? 'text-yellow-400' : 'text-blue-400'}`}>
          {position}
        </span>
        {!isBanker && fakeBetAmount > 0 && (
          <span className="ml-2 text-gray-400 text-[10px]">{formatAmount(fakeBetAmount)}</span>
        )}
        {!isBanker && betAmount > 0 && (
          <span className="ml-2 bg-yellow-400 text-black px-2 py-0.5 rounded text-xs font-bold">
            ${betAmount}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex justify-center gap-1 mb-2">
        {hand?.cards && isRevealed ? (
          hand.cards.map((card, i) => (
            <div key={i} className="transform scale-75">
              {skipAnimation ? (
                <PlayingCard card={card} size="sm" />
              ) : (
                <AnimatedPlayingCard
                  card={card}
                  size="sm"
                  flyFrom={{ x: 0, y: -60 }}
                  flyDelay={revealDelay + i * 0.1}
                  flyDuration={0.3}
                  flipDelay={0.2}
                  flipDuration={0.4}
                  glowing={isHighRank}
                  glowColor="rgba(251, 191, 36, 0.5)"
                  skipAnimation={skipAnimation}
                />
              )}
            </div>
          ))
        ) : dealCount > 0 ? (
          Array.from({ length: Math.min(dealCount, 5) }).map((_, i) => (
            <motion.div
              key={`dealing-${i}`}
              className="transform scale-75"
              initial={skipAnimation ? {} : { y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: skipAnimation ? 0 : i * 0.08, duration: 0.3 }}
            >
              <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown size="sm" />
            </motion.div>
          ))
        ) : (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-10 h-14 bg-gray-800 rounded border border-gray-700" />
          ))
        )}
      </div>

      {/* Rank */}
      <AnimatePresence>
        {hand?.rankName && isRevealed && (
          <motion.div
            initial={skipAnimation ? {} : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: skipAnimation ? 0 : revealDelay + 0.6 }}
            className="text-center"
          >
            <span className={`font-bold text-lg ${
              hand.rank === 'five_face' || hand.rank === 'bull_bull' ? 'text-yellow-400' :
              hand.rank.startsWith('bull_') ? 'text-green-400' : 'text-gray-400'
            }`}>
              {hand.rankName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result indicator */}
      <AnimatePresence>
        {result && !isBanker && isRevealed && (
          <motion.div
            initial={skipAnimation ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: skipAnimation ? 0 : revealDelay + 0.8 }}
            className={`absolute -top-2 -right-2 px-2 py-1 rounded text-xs font-bold ${
              result === 'win' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {result === 'win' ? '贏' : '輸'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Bet type labels for notification
const betTypeLabels: Record<string, string> = {
  bb_banker: '莊家',
  bb_player1: '閒1',
  bb_player2: '閒2',
  bb_player3: '閒3',
};

export default function BullBullGame() {
  const navigate = useNavigate();

  // Get tableId from URL query params
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table') || undefined;

  const { submitBets, cancelBets } = useBullBullSocket(tableId);

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
    banker,
    player1,
    player2,
    player3,
    player1Result,
    player2Result,
    player3Result,
    dealingCards,
    revealedPositions,
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
    fakeBets,
  } = useBullBullStore();

  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { play: playSound } = useTTS(isMuted);
  const [isBgmOn, setIsBgmOn] = useState(true);
  const { toggleBgm } = useBackgroundMusic(isMuted);

  // Skip animation if reconnecting mid-round
  // Normal flow: phase → dealing first, then cards/reveal events
  // Reconnect: bb:state sends phase + hands together
  const [skipBBCardAnim, setSkipBBCardAnim] = useState(false);
  const expectingBBCardsRef = useRef(false);

  const prevBBPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'dealing' && prevBBPhaseRef.current !== 'dealing') {
      expectingBBCardsRef.current = true;
    }
    if (phase === 'betting') {
      expectingBBCardsRef.current = false;
      setSkipBBCardAnim(false);
    }
    prevBBPhaseRef.current = phase;
  }, [phase]);

  const prevBankerRef = useRef(banker);
  useEffect(() => {
    if (banker && !prevBankerRef.current) {
      if (expectingBBCardsRef.current) {
        setSkipBBCardAnim(false);
      } else {
        setSkipBBCardAnim(true);
      }
    }
    if (!banker) {
      setSkipBBCardAnim(false);
    }
    prevBankerRef.current = banker;
  }, [banker]);

  // Count dealt cards per position
  const getDealCount = (target: string) =>
    dealingCards.filter(c => c.target === target).length;

  // Bet success notification
  const [betNotification, setBetNotification] = useState<{
    show: boolean;
    bets: Array<{ type: string; amount: number }>;
    total: number;
  }>({ show: false, bets: [], total: 0 });

  // Previous confirmed bets count to detect new confirmations
  const prevConfirmedBetsRef = useRef<number>(0);
  const betNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show bet success notification when confirmedBets changes
  useEffect(() => {
    const currentCount = confirmedBets.length;
    const prevCount = prevConfirmedBetsRef.current;

    // Only show notification when bets are newly confirmed (count increased)
    if (currentCount > 0 && currentCount > prevCount && phase === 'betting') {
      playSound('betSuccess');
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

  // Reset notification reference when round changes
  useEffect(() => {
    prevConfirmedBetsRef.current = 0;
  }, [roundNumber]);

  const canBet = phase === 'betting';
  const hasPendingBets = pendingBets.length > 0;
  const hasConfirmedBets = confirmedBets.length > 0;

  const handleBet = (type: BullBullBetType) => {
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

  // Get phase display text
  const getPhaseDisplay = () => {
    switch (phase) {
      case 'betting':
        return { text: '請下注', color: 'text-green-400' };
      case 'sealed':
        return { text: '停止下注', color: 'text-yellow-400' };
      case 'dealing':
        return { text: '發牌中', color: 'text-blue-400' };
      case 'result':
        return { text: '開獎', color: 'text-purple-400' };
      default:
        return { text: '', color: '' };
    }
  };

  const phaseDisplay = getPhaseDisplay();

  return (
    <div className="h-screen flex flex-col bg-[#0a0e14] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-[#0d1117]/80 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold">牛牛</h1>
            <div className="text-[10px] sm:text-xs text-gray-400">
              靴 #{shoeNumber} · 局 #{roundNumber}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Connection status */}
          <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>

          {/* Balance */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg">
            <div className="text-[10px] sm:text-xs text-yellow-200">餘額</div>
            <div className="text-sm sm:text-base font-bold">${balance.toLocaleString()}</div>
          </div>

          {/* Sound controls */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-gray-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { const on = toggleBgm(); setIsBgmOn(on); }}
            className={`p-1.5 ${isBgmOn && !isMuted ? 'text-yellow-400' : 'text-gray-400'} hover:text-white`}
            title={isBgmOn ? '關閉背景音樂' : '開啟背景音樂'}
          >
            {isBgmOn && !isMuted ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
          </button>

          {/* Help */}
          <button
            onClick={() => setShowRules(true)}
            className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main game area - 3D Dealer Table */}
      <DealerTable3D
        phase={phase}
        isDealing={phase === 'dealing'}
        dealerName="小美"
        gameType="bullBull"
      >
        <div className="absolute inset-0 overflow-auto p-2 sm:p-4 pb-32 sm:pb-36">
          {/* Countdown timer */}
          <CountdownTimer timeRemaining={timeRemaining} phase={phase} />

          {/* Phase and timer */}
          <div className="text-center mb-3 sm:mb-4">
            <div className={`text-lg sm:text-xl font-bold ${phaseDisplay.color}`}>
              {phaseDisplay.text}
            </div>
          </div>

          {/* Hands display */}
          <div className="max-w-4xl mx-auto">
            {/* Banker */}
            <div className="mb-4 sm:mb-6">
              <HandDisplay
                position="莊家"
                hand={banker}
                isBanker
                betAmount={getBetAmount('bb_banker')}
                onBet={() => handleBet('bb_banker')}
                canBet={canBet}
                dealCount={getDealCount('banker')}
                isRevealed={revealedPositions.has('banker')}
                revealDelay={0}
                skipAnimation={skipBBCardAnim}
              />
            </div>

            {/* Players */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <HandDisplay
                position="閒1"
                hand={player1}
                result={player1Result}
                betAmount={getBetAmount('bb_player1')}
                fakeBetAmount={fakeBets.bb_player1 || 0}
                onBet={() => handleBet('bb_player1')}
                canBet={canBet}
                dealCount={getDealCount('player1')}
                isRevealed={revealedPositions.has('player1')}
                revealDelay={0.8}
                skipAnimation={skipBBCardAnim}
              />
              <HandDisplay
                position="閒2"
                hand={player2}
                result={player2Result}
                betAmount={getBetAmount('bb_player2')}
                fakeBetAmount={fakeBets.bb_player2 || 0}
                onBet={() => handleBet('bb_player2')}
                canBet={canBet}
                dealCount={getDealCount('player2')}
                isRevealed={revealedPositions.has('player2')}
                revealDelay={1.6}
                skipAnimation={skipBBCardAnim}
              />
              <HandDisplay
                position="閒3"
                hand={player3}
                result={player3Result}
                betAmount={getBetAmount('bb_player3')}
                fakeBetAmount={fakeBets.bb_player3 || 0}
                onBet={() => handleBet('bb_player3')}
                canBet={canBet}
                dealCount={getDealCount('player3')}
                isRevealed={revealedPositions.has('player3')}
                revealDelay={2.4}
                skipAnimation={skipBBCardAnim}
              />
            </div>
          </div>

          {/* Settlement display */}
          {lastSettlement && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-4 text-center"
            >
              <div className={`text-3xl font-bold ${lastSettlement.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {lastSettlement.netResult >= 0 ? '+' : ''}{lastSettlement.netResult.toLocaleString()}
              </div>
            </motion.div>
          )}

          {/* Roadmap */}
          <div className="mt-3 sm:mt-4 bg-black/30 rounded-lg p-2 sm:p-4 max-w-4xl mx-auto">
            <div className="text-xs sm:text-sm font-bold mb-2 sm:mb-3">歷史記錄</div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-xs overflow-x-auto">
              {roadmapData.slice(-30).map((round, i) => (
                <div key={i} className="p-1 bg-gray-800/50 rounded text-center">
                  <div className="font-bold text-yellow-400 text-[10px]">
                    {RANK_NAMES[round.bankerRank as keyof typeof RANK_NAMES] || round.bankerRank}
                  </div>
                  <div className="flex gap-0.5 justify-center mt-0.5">
                    <span className={round.player1Result === 'win' ? 'text-green-400' : 'text-red-400'}>
                      {round.player1Result === 'win' ? 'W' : 'L'}
                    </span>
                    <span className={round.player2Result === 'win' ? 'text-green-400' : 'text-red-400'}>
                      {round.player2Result === 'win' ? 'W' : 'L'}
                    </span>
                    <span className={round.player3Result === 'win' ? 'text-green-400' : 'text-red-400'}>
                      {round.player3Result === 'win' ? 'W' : 'L'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DealerTable3D>

      {/* Betting panel - Desktop */}
      <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-[#0d1117]/95 border-t border-gray-800 p-4 pb-safe">
        {/* Payout info */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 text-[10px] sm:text-xs text-gray-400">
          <span>五花牛 5:1</span>
          <span>牛牛 3:1</span>
          <span>牛七~牛九 2:1</span>
          <span>牛一~牛六/无牛 1:1</span>
        </div>

        {/* Chips and controls */}
        <div className="flex items-center justify-between max-w-3xl mx-auto gap-4">
          {/* Chips */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
            {CHIP_VALUES.map((value) => (
              <Chip
                key={value}
                value={value}
                selected={selectedChip === value}
                onClick={() => setSelectedChip(value)}
                disabled={!canBet}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCancel}
              disabled={!canBet || (!hasPendingBets && !hasConfirmedBets)}
              className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 sm:gap-2 text-sm"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">取消</span>
            </button>
            <button
              onClick={handleRepeat}
              disabled={!canBet || lastBets.length === 0}
              className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 sm:gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">重複</span>
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canBet || !hasPendingBets}
              className="px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 sm:gap-2 font-bold text-sm"
            >
              <Check className="w-4 h-4" />
              確認
            </button>
          </div>
        </div>
      </div>

      {/* Betting panel - Mobile chips only */}
      <div className="sm:hidden fixed bottom-14 left-0 right-0 bg-[#0d1117]/95 border-t border-gray-800 px-2 py-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide justify-center">
          {CHIP_VALUES.map((value) => (
            <Chip
              key={value}
              value={value}
              selected={selectedChip === value}
              onClick={() => setSelectedChip(value)}
              disabled={!canBet}
            />
          ))}
        </div>
      </div>

      {/* Rules modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1f2e] rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">牛牛規則</h2>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h3 className="font-bold text-white mb-2">遊戲說明</h3>
                  <p>每個位置發5張牌，分成3+2組合。</p>
                  <p>3張牌總和為10的倍數才有「牛」。</p>
                  <p>A=1, 2-9=面值, 10/J/Q/K=0 (只取個位數)</p>
                </div>

                <div>
                  <h3 className="font-bold text-white mb-2">牌型排名 (高到低)</h3>
                  <ul className="space-y-1">
                    <li>• 五花牛: 5張都是J/Q/K (5:1)</li>
                    <li>• 牛牛: 3張=0 且 2張=0 (3:1)</li>
                    <li>• 牛九~牛七: 3張=0, 2張=9~7 (2:1)</li>
                    <li>• 牛六~牛一: 3張=0, 2張=6~1 (1:1)</li>
                    <li>• 无牛: 找不到3張=0的組合 (1:1)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-white mb-2">投注說明</h3>
                  <p>點擊閒1、閒2、閒3區域下注，各位置獨立與莊家比大小。</p>
                  <p>贏則獲得對應牌型的賠率，輸則損失本金。</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="font-bold text-sm mb-1">下注成功</div>
                <div className="text-xs space-y-0.5">
                  {betNotification.bets.map((bet, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span>{betTypeLabels[bet.type] || bet.type}</span>
                      <span className="font-bold">¥{bet.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 pt-1 border-t border-white/20 text-xs font-bold flex justify-between">
                  <span>总计</span>
                  <span>¥{betNotification.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar
        className="sm:hidden"
        variant="game"
        balance={balance}
        totalBet={pendingBets.reduce((sum, b) => sum + b.amount, 0) + confirmedBets.reduce((sum, b) => sum + b.amount, 0)}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onClear={clearPendingBets}
        canBet={canBet}
        hasBets={hasPendingBets}
      />
    </div>
  );
}
