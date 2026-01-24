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
import { useDragonTigerStore, type DragonTigerBetType, CHIP_VALUES } from '../store/dragonTigerStore';
import { useDragonTigerSocket } from '../hooks/useDragonTigerSocket';
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

// Betting button component
function BettingButton({
  label,
  payout,
  betAmount,
  onClick,
  disabled,
  color,
  className = '',
}: {
  label: string;
  payout: string;
  betAmount: number;
  onClick: () => void;
  disabled: boolean;
  color: 'red' | 'blue' | 'green' | 'gold';
  className?: string;
}) {
  const colorStyles = {
    red: 'from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border-red-500',
    blue: 'from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 border-blue-500',
    green: 'from-green-700 to-green-900 hover:from-green-600 hover:to-green-800 border-green-500',
    gold: 'from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 border-yellow-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
      } bg-gradient-to-b ${colorStyles[color]} ${className}`}
    >
      <span className="text-white font-bold text-lg">{label}</span>
      <span className="text-white/70 text-xs">{payout}</span>
      {betAmount > 0 && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full px-2 py-0.5 text-xs font-bold">
          ${betAmount}
        </div>
      )}
    </button>
  );
}

// Roadmap cell
function RoadmapCell({ result }: { result?: 'dragon' | 'tiger' | 'tie' }) {
  if (!result) {
    return <div className="w-6 h-6 bg-gray-800/50 rounded" />;
  }

  const colors = {
    dragon: 'bg-red-600',
    tiger: 'bg-blue-600',
    tie: 'bg-green-600',
  };

  return (
    <div className={`w-6 h-6 rounded-full ${colors[result]} flex items-center justify-center text-white text-xs font-bold`}>
      {result === 'dragon' ? '龍' : result === 'tiger' ? '虎' : '和'}
    </div>
  );
}

// Bet type labels for notification
const betTypeLabels: Record<string, string> = {
  dragon: '龍',
  tiger: '虎',
  dt_tie: '和',
  dt_suited_tie: '同花和',
  dragon_big: '龍大',
  dragon_small: '龍小',
  tiger_big: '虎大',
  tiger_small: '虎小',
};

export default function DragonTigerGame() {
  const navigate = useNavigate();
  const { submitBets, cancelBets } = useDragonTigerSocket();

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
    isSuitedTie,
    lastSettlement,
    roadmapData,
    shoeNumber,
    lastBets,
  } = useDragonTigerStore();

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
            <h1 className="text-lg font-bold">龍虎</h1>
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
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Cards display */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
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

          {/* Cards */}
          <div className="flex items-center justify-center gap-16">
            {/* Dragon */}
            <div className="text-center">
              <div className="text-xl font-bold text-red-400 mb-4">龍</div>
              <div className="relative">
                {dragonCard ? (
                  <PlayingCard card={dragonCard} size="lg" />
                ) : (
                  <div className="w-24 h-32 bg-gradient-to-br from-red-900 to-red-950 rounded-lg border-2 border-red-700 flex items-center justify-center">
                    <span className="text-red-400 text-4xl">龍</span>
                  </div>
                )}
                {dragonValue !== null && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                    {dragonValue}
                  </div>
                )}
              </div>
            </div>

            {/* VS */}
            <div className="text-3xl font-bold text-gray-500">VS</div>

            {/* Tiger */}
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400 mb-4">虎</div>
              <div className="relative">
                {tigerCard ? (
                  <PlayingCard card={tigerCard} size="lg" />
                ) : (
                  <div className="w-24 h-32 bg-gradient-to-br from-blue-900 to-blue-950 rounded-lg border-2 border-blue-700 flex items-center justify-center">
                    <span className="text-blue-400 text-4xl">虎</span>
                  </div>
                )}
                {tigerValue !== null && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                    {tigerValue}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result display */}
          {lastResult && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-8"
            >
              <div className={`text-3xl font-bold px-8 py-4 rounded-xl ${
                lastResult === 'dragon' ? 'bg-red-600' :
                lastResult === 'tiger' ? 'bg-blue-600' :
                'bg-green-600'
              }`}>
                {lastResult === 'dragon' ? '龍 贏!' :
                 lastResult === 'tiger' ? '虎 贏!' :
                 isSuitedTie ? '同花和!' : '和局!'}
              </div>
            </motion.div>
          )}

          {/* Settlement display */}
          {lastSettlement && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-4 text-center"
            >
              <div className={`text-2xl font-bold ${lastSettlement.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {lastSettlement.netResult >= 0 ? '+' : ''}{lastSettlement.netResult.toLocaleString()}
              </div>
            </motion.div>
          )}
        </div>

        {/* Roadmap */}
        <div className="w-full lg:w-64 bg-[#0d1117] rounded-lg p-3">
          <div className="text-sm font-bold mb-2">路單</div>
          <div className="grid grid-cols-8 gap-1">
            {roadmapData.slice(-64).map((round, i) => (
              <RoadmapCell key={i} result={round.result} />
            ))}
            {Array.from({ length: Math.max(0, 64 - roadmapData.length) }).map((_, i) => (
              <RoadmapCell key={`empty-${i}`} />
            ))}
          </div>
          {/* Stats */}
          <div className="flex justify-around mt-3 text-xs">
            <div className="text-center">
              <div className="text-red-400 font-bold">
                {roadmapData.filter(r => r.result === 'dragon').length}
              </div>
              <div className="text-gray-400">龍</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-bold">
                {roadmapData.filter(r => r.result === 'tie').length}
              </div>
              <div className="text-gray-400">和</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-bold">
                {roadmapData.filter(r => r.result === 'tiger').length}
              </div>
              <div className="text-gray-400">虎</div>
            </div>
          </div>
        </div>
      </div>

      {/* Betting panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117]/95 border-t border-gray-800 p-4">
        {/* Betting buttons */}
        <div className="grid grid-cols-5 gap-2 mb-4 max-w-3xl mx-auto">
          <BettingButton
            label="龍大"
            payout="1:1"
            betAmount={getBetAmount('dragon_big')}
            onClick={() => handleBet('dragon_big')}
            disabled={!canBet}
            color="red"
            className="h-16"
          />
          <BettingButton
            label="龍"
            payout="1:1"
            betAmount={getBetAmount('dragon')}
            onClick={() => handleBet('dragon')}
            disabled={!canBet}
            color="red"
            className="h-16"
          />
          <BettingButton
            label="和"
            payout="8:1"
            betAmount={getBetAmount('dt_tie')}
            onClick={() => handleBet('dt_tie')}
            disabled={!canBet}
            color="green"
            className="h-16"
          />
          <BettingButton
            label="虎"
            payout="1:1"
            betAmount={getBetAmount('tiger')}
            onClick={() => handleBet('tiger')}
            disabled={!canBet}
            color="blue"
            className="h-16"
          />
          <BettingButton
            label="虎大"
            payout="1:1"
            betAmount={getBetAmount('tiger_big')}
            onClick={() => handleBet('tiger_big')}
            disabled={!canBet}
            color="blue"
            className="h-16"
          />
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4 max-w-3xl mx-auto">
          <BettingButton
            label="龍小"
            payout="1:1"
            betAmount={getBetAmount('dragon_small')}
            onClick={() => handleBet('dragon_small')}
            disabled={!canBet}
            color="red"
            className="h-12"
          />
          <div /> {/* Spacer */}
          <BettingButton
            label="同花和"
            payout="50:1"
            betAmount={getBetAmount('dt_suited_tie')}
            onClick={() => handleBet('dt_suited_tie')}
            disabled={!canBet}
            color="gold"
            className="h-12"
          />
          <div /> {/* Spacer */}
          <BettingButton
            label="虎小"
            payout="1:1"
            betAmount={getBetAmount('tiger_small')}
            onClick={() => handleBet('tiger_small')}
            disabled={!canBet}
            color="blue"
            className="h-12"
          />
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
                <h2 className="text-xl font-bold">龍虎規則</h2>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h3 className="font-bold text-white mb-2">遊戲說明</h3>
                  <p>龍虎各發一張牌，比較大小。牌面大者勝。</p>
                  <p>A為最小 (1點)，K為最大 (13點)。</p>
                </div>

                <div>
                  <h3 className="font-bold text-white mb-2">投注類型與賠率</h3>
                  <ul className="space-y-1">
                    <li>• 龍/虎: 1:1 (和局退還一半本金)</li>
                    <li>• 和: 8:1</li>
                    <li>• 同花和: 50:1 (點數+花色都相同)</li>
                    <li>• 龍大/虎大: 1:1 (牌面 &gt; 7)</li>
                    <li>• 龍小/虎小: 1:1 (牌面 &lt; 7)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-white mb-2">特殊規則</h3>
                  <p>• 和局時，龍/虎投注退還一半本金</p>
                  <p>• 大小投注時，牌面為7則為和局 (退還本金)</p>
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
