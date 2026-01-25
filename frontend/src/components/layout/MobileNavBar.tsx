import { Home, Menu, X, Check, RotateCcw, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MobileNavBarProps {
  variant: 'lobby' | 'game';
  balance?: number;
  totalBet?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  canBet?: boolean;
  hasBets?: boolean;
  className?: string;
}

export function MobileNavBar({
  variant,
  balance = 0,
  totalBet = 0,
  onConfirm,
  onCancel,
  onClear,
  canBet = false,
  hasBets = false,
  className = '',
}: MobileNavBarProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (variant === 'lobby') {
    return (
      <nav className={`fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-gray-800 pb-safe z-50 ${className}`}>
        <div className="flex items-center justify-around h-14 px-4">
          {/* Balance display */}
          <div className="flex items-center gap-2 text-amber-400">
            <Wallet className="w-5 h-5" />
            <span className="font-bold">${balance.toLocaleString()}</span>
          </div>

          {/* Menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Expandable menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 bg-[#0d1117] border-t border-gray-800 p-4 animate-slide-up">
            <div className="space-y-2">
              <button
                onClick={() => { navigate('/'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                <Home className="w-5 h-5 text-gray-400" />
                <span className="text-white">遊戲大廳</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    );
  }

  // Game variant
  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-gray-800 pb-safe z-50 ${className}`}>
      <div className="flex items-center justify-between h-14 px-3 gap-2">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-400 hover:text-white transition-colors shrink-0"
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Balance & Total Bet */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Wallet className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm truncate">${balance.toLocaleString()}</span>
          </div>
          {totalBet > 0 && (
            <div className="text-gray-400 text-sm">
              下注: <span className="text-white font-medium">${totalBet.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Clear button */}
          {hasBets && onClear && (
            <button
              onClick={onClear}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="清除下注"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {/* Cancel button */}
          {hasBets && onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
              title="取消"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Confirm button */}
          {canBet && onConfirm && (
            <button
              onClick={onConfirm}
              disabled={!hasBets}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${
                hasBets
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              確認
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default MobileNavBar;
