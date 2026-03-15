import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { GameResult } from '../../../types';
import {
  buildBigRoadColumns,
  buildBigRoadGrid,
  buildDerivedRoad,
  buildBeadRoadGrid,
  type RoadHistoryEntry,
} from '../../../utils/roadmap';

type RoadmapEntry = {
  roundNumber: string;
  result: GameResult;
  playerPair: boolean;
  bankerPair: boolean;
  playerPoints: number;
  bankerPoints: number;
  totalCards: number;
};

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RoadmapEntry[];
}

type RoadType = 'bead' | 'big' | 'bigEye' | 'small' | 'cockroach';

const CELL_BG = '#1e2433';
const LINE_COLOR = '#2a3142';

export default function RoadmapModal({ isOpen, onClose, data }: RoadmapModalProps) {
  const { t } = useTranslation();
  const [activeRoad, setActiveRoad] = useState<RoadType>('bead');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to rightmost (latest data) when tab changes or modal opens
  const scrollToRight = useCallback(() => {
    requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!container) return;
      const scrollable = container.querySelector('.overflow-x-auto');
      if (scrollable) {
        scrollable.scrollLeft = scrollable.scrollWidth;
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToRight();
  }, [isOpen, activeRoad, scrollToRight]);

  const roadHistory: RoadHistoryEntry[] = useMemo(() =>
    data.map(r => ({ result: r.result, playerPair: r.playerPair, bankerPair: r.bankerPair })),
    [data]
  );

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);

  const tabs: { type: RoadType; label: string }[] = [
    { type: 'bead', label: '珠盤路' },
    { type: 'big', label: '大路' },
    { type: 'bigEye', label: '大眼路' },
    { type: 'small', label: '小路' },
    { type: 'cockroach', label: '蟑螂路' },
  ];

  // ── Bead Road ──
  const renderBeadRoad = () => {
    const ROWS = 6;
    const grid = buildBeadRoadGrid(roadHistory, ROWS);
    const totalCols = grid[0]?.length ?? 0;
    const displayCols = Math.max(totalCols, 10);

    const cells: React.ReactNode[] = [];
    for (let c = 0; c < displayCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const entry = grid[r]?.[c] ?? null;
        const key = `bead-${r}-${c}`;

        if (!entry) {
          cells.push(<div key={key} style={{ background: CELL_BG }} />);
          continue;
        }

        let bgColor = '#FFFFFF';
        let text = '';
        if (entry.result === 'banker') { bgColor = '#DC2626'; text = '莊'; }
        else if (entry.result === 'player') { bgColor = '#2563EB'; text = '閒'; }
        else if (entry.result === 'tie') { bgColor = '#16A34A'; text = '和'; }

        cells.push(
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 22, height: 22, backgroundColor: bgColor }}
            >
              <span style={{ color: '#FFFFFF', fontSize: '9px', fontWeight: 'bold', lineHeight: 1 }}>{text}</span>
            </div>
            {entry.bankerPair && (
              <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#DC2626', border: '1px solid #1e2433' }} />
            )}
            {entry.playerPair && (
              <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#2563EB', border: '1px solid #1e2433' }} />
            )}
          </div>
        );
      }
    }

    return (
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateRows: `repeat(${ROWS}, 28px)`,
            gridTemplateColumns: `repeat(${displayCols}, 28px)`,
            gridAutoFlow: 'column',
            gap: '1px',
            backgroundColor: LINE_COLOR,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  // ── Big Road ──
  const renderBigRoad = () => {
    const ROWS = 6;
    const LARGE_COLS = 200;
    const gridLarge = buildBigRoadGrid(bigRoadColumns, ROWS, LARGE_COLS);

    // Find rightmost used column
    let maxUsedCol = 0;
    for (let c = 0; c < LARGE_COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (gridLarge[r][c]) maxUsedCol = c;
      }
    }
    const displayCols = Math.max(maxUsedCol + 1, 14);

    const cells: React.ReactNode[] = [];
    for (let c = 0; c < displayCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = gridLarge[r]?.[c] ?? null;
        const key = `br-${r}-${c}`;

        if (!cell) {
          cells.push(<div key={key} style={{ background: CELL_BG }} />);
          continue;
        }

        const borderColor = cell.result === 'banker' ? '#DC2626' : '#2563EB';
        cells.push(
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full"
              style={{ width: 18, height: 18, border: `2px solid ${borderColor}` }}
            >
              {cell.tieCount > 0 && (
                <span className="flex items-center justify-center text-green-500 font-bold" style={{ fontSize: '8px', lineHeight: '14px' }}>
                  {cell.tieCount}
                </span>
              )}
            </div>
            {cell.bankerPair && (
              <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#DC2626', border: '1px solid #1e2433' }} />
            )}
            {cell.playerPair && (
              <div className="absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#2563EB', border: '1px solid #1e2433' }} />
            )}
          </div>
        );
      }
    }

    return (
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateRows: `repeat(${ROWS}, 28px)`,
            gridTemplateColumns: `repeat(${displayCols}, 28px)`,
            gridAutoFlow: 'column',
            gap: '1px',
            backgroundColor: LINE_COLOR,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  // ── Derived Roads ──
  const renderDerivedRoad = (type: 'bigEye' | 'small' | 'cockroach') => {
    const offset = type === 'bigEye' ? 1 : type === 'small' ? 2 : 3;
    const ROWS = 6;
    const LARGE_COLS = 200;
    const grid = buildDerivedRoad(bigRoadColumns, offset, ROWS, LARGE_COLS);

    // Find rightmost used column
    let maxUsedCol = 0;
    for (let c = 0; c < LARGE_COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c]) maxUsedCol = c;
      }
    }
    const displayCols = Math.max(maxUsedCol + 1, 14);

    const cells: React.ReactNode[] = [];
    for (let c = 0; c < displayCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const value = grid[r]?.[c] ?? null;
        const key = `dr-${r}-${c}`;

        if (!value) {
          cells.push(<div key={key} style={{ background: CELL_BG }} />);
          continue;
        }

        const color = value === 'red' ? '#DC2626' : '#2563EB';

        if (type === 'bigEye') {
          cells.push(
            <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
              <div className="rounded-full" style={{ width: 12, height: 12, border: `2px solid ${color}` }} />
            </div>
          );
        } else if (type === 'small') {
          cells.push(
            <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
              <div className="rounded-full" style={{ width: 10, height: 10, backgroundColor: color }} />
            </div>
          );
        } else {
          cells.push(
            <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
              <svg viewBox="0 0 10 10" style={{ width: 12, height: 12 }}>
                <line x1="1" y1="9" x2="9" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          );
        }
      }
    }

    return (
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateRows: `repeat(${ROWS}, 20px)`,
            gridTemplateColumns: `repeat(${displayCols}, 20px)`,
            gridAutoFlow: 'column',
            gap: '1px',
            backgroundColor: LINE_COLOR,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  const bankerWins = data.filter(r => r.result === 'banker').length;
  const playerWins = data.filter(r => r.result === 'player').length;
  const ties = data.filter(r => r.result === 'tie').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#141922] rounded-xl w-[95vw] sm:w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <h3 className="text-white font-bold">{t('roadmap') || '路單'}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700/50">
              {tabs.map((tab) => (
                <button
                  key={tab.type}
                  onClick={() => setActiveRoad(tab.type)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                    activeRoad === tab.type
                      ? 'bg-gray-700/50 text-amber-400 border-b-2 border-amber-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 p-3 overflow-auto">
              {activeRoad === 'bead' && renderBeadRoad()}
              {activeRoad === 'big' && renderBigRoad()}
              {activeRoad === 'bigEye' && renderDerivedRoad('bigEye')}
              {activeRoad === 'small' && renderDerivedRoad('small')}
              {activeRoad === 'cockroach' && renderDerivedRoad('cockroach')}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around py-2 border-t border-gray-700/50">
              <span className="text-red-500 font-bold text-sm">莊 <span className="text-white">{bankerWins}</span></span>
              <span className="text-blue-500 font-bold text-sm">閒 <span className="text-white">{playerWins}</span></span>
              <span className="text-green-500 font-bold text-sm">和 <span className="text-white">{ties}</span></span>
              <span className="text-gray-400 text-sm">總 <span className="text-white">{data.length}</span></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
