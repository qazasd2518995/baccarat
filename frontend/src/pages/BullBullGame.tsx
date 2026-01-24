import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  HelpCircle,
  X,
  RotateCcw,
  Check,
  Wifi,
  WifiOff,
  CheckCircle,
} from 'lucide-react';
import { useBullBullStore, type BullBullBetType, CHIP_VALUES, RANK_NAMES } from '../store/bullBullStore';
import { useBullBullSocket } from '../hooks/useBullBullSocket';
import PlayingCard from '../components/game/PlayingCard';

// Chip component - Casino style with edge notches (matches ChipSettingsModal)
function Chip({ value, selected, onClick, disabled }: { value: number; selected: boolean; onClick: () => void; disabled?: boolean }) {
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

  const color = chipColors[value] || 'from-gray-500 to-gray-700';

  // Format chip value display
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

// Hand display component
function HandDisplay({
  position,
  hand,
  result,
  isBanker = false,
  betAmount,
  onBet,
  canBet,
}: {
  position: string;
  hand: { cards: any[]; rank: string; rankName: string } | null;
  result?: 'win' | 'lose' | null;
  isBanker?: boolean;
  betAmount: number;
  onBet: () => void;
  canBet: boolean;
}) {
  const bgColor = isBanker
    ? 'from-yellow-900/50 to-yellow-950/50 border-yellow-600'
    : result === 'win'
      ? 'from-green-900/50 to-green-950/50 border-green-500'
      : result === 'lose'
        ? 'from-red-900/50 to-red-950/50 border-red-500'
        : 'from-blue-900/50 to-blue-950/50 border-blue-600';

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
        {!isBanker && betAmount > 0 && (
          <span className="ml-2 bg-yellow-400 text-black px-2 py-0.5 rounded text-xs font-bold">
            ${betAmount}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex justify-center gap-1 mb-2">
        {hand?.cards ? (
          hand.cards.map((card, i) => (
            <div key={i} className="transform scale-75">
              <PlayingCard card={card} size="sm" />
            </div>
          ))
        ) : (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-10 h-14 bg-gray-800 rounded border border-gray-700" />
          ))
        )}
      </div>

      {/* Rank */}
      {hand?.rankName && (
        <div className="text-center">
          <span className={`font-bold text-lg ${
            hand.rank === 'five_face' || hand.rank === 'bull_bull' ? 'text-yellow-400' :
            hand.rank.startsWith('bull_') ? 'text-green-400' : 'text-gray-400'
          }`}>
            {hand.rankName}
          </span>
        </div>
      )}

      {/* Result indicator */}
      {result && !isBanker && (
        <div className={`absolute -top-2 -right-2 px-2 py-1 rounded text-xs font-bold ${
          result === 'win' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {result === 'win' ? '贏' : '輸'}
        </div>
      )}
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
  const { submitBets, cancelBets } = useBullBullSocket();

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
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
  } = useBullBullStore();

  const [showRules, setShowRules] = useState(false);

  // Bet success notification
  const [betNotification, setBetNotification] = useState<{
    show: boolean;
    bets: Array<{ type: string; amount: number }>;
    total: number;
  }>({ show: false, bets: [], total: 0 });

  // Previous confirmed bets count to detect new confirmations
  const prevConfirmedBetsRef = useRef<number>(0);

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

  const canBet = phase === 'betting';
  const hasPendingBets = pendingBets.length > 0;
  const hasConfirmedBets = confirmedBets.length > 0;

  const handleBet = (type: BullBullBetType) => {
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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f2e] to-[#0d1117] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117]/80 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold">牛牛</h1>
            <div className="text-xs text-gray-400">
              靴 #{shoeNumber} · 局 #{roundNumber}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>

          {/* Balance */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-4 py-2 rounded-lg">
            <div className="text-xs text-yellow-200">餘額</div>
            <div className="font-bold">${balance.toLocaleString()}</div>
          </div>

          {/* Help */}
          <button
            onClick={() => setShowRules(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      {/* Main game area */}
      <div className="p-4">
        {/* Phase and timer */}
        <div className="text-center mb-6">
          <div className={`text-2xl font-bold ${phaseDisplay.color}`}>
            {phaseDisplay.text}
          </div>
          {phase === 'betting' && (
            <div className="text-4xl font-bold text-white mt-2">
              {timeRemaining}
            </div>
          )}
        </div>

        {/* Hands display */}
        <div className="max-w-4xl mx-auto">
          {/* Banker */}
          <div className="mb-6">
            <HandDisplay
              position="莊家"
              hand={banker}
              isBanker
              betAmount={getBetAmount('bb_banker')}
              onBet={() => handleBet('bb_banker')}
              canBet={canBet}
            />
          </div>

          {/* Players */}
          <div className="grid grid-cols-3 gap-4">
            <HandDisplay
              position="閒1"
              hand={player1}
              result={player1Result}
              betAmount={getBetAmount('bb_player1')}
              onBet={() => handleBet('bb_player1')}
              canBet={canBet}
            />
            <HandDisplay
              position="閒2"
              hand={player2}
              result={player2Result}
              betAmount={getBetAmount('bb_player2')}
              onBet={() => handleBet('bb_player2')}
              canBet={canBet}
            />
            <HandDisplay
              position="閒3"
              hand={player3}
              result={player3Result}
              betAmount={getBetAmount('bb_player3')}
              onBet={() => handleBet('bb_player3')}
              canBet={canBet}
            />
          </div>
        </div>

        {/* Settlement display */}
        {lastSettlement && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-6 text-center"
          >
            <div className={`text-3xl font-bold ${lastSettlement.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {lastSettlement.netResult >= 0 ? '+' : ''}{lastSettlement.netResult.toLocaleString()}
            </div>
          </motion.div>
        )}

        {/* Roadmap */}
        <div className="mt-6 bg-[#0d1117] rounded-lg p-4 max-w-4xl mx-auto">
          <div className="text-sm font-bold mb-3">歷史記錄</div>
          <div className="grid grid-cols-10 gap-1 text-xs">
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

      {/* Betting panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117]/95 border-t border-gray-800 p-4">
        {/* Payout info */}
        <div className="flex justify-center gap-4 mb-4 text-xs text-gray-400">
          <span>五花牛 5:1</span>
          <span>牛牛 3:1</span>
          <span>牛七~牛九 2:1</span>
          <span>牛一~牛六/无牛 1:1</span>
        </div>

        {/* Chips and controls */}
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {/* Chips */}
          <div className="flex gap-2">
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
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={!canBet || (!hasPendingBets && !hasConfirmedBets)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
            >
              <X size={18} />
              取消
            </button>
            <button
              onClick={handleRepeat}
              disabled={!canBet || lastBets.length === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
            >
              <RotateCcw size={18} />
              重複
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canBet || !hasPendingBets}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 font-bold"
            >
              <Check size={18} />
              確認
            </button>
          </div>
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
    </div>
  );
}
