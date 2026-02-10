import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { GameResult } from '../../../types';

type RoadmapEntry = {
  roundNumber: number;
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

interface BigRoadCell {
  result: 'player' | 'banker';
  tieCount: number;
  playerPair: boolean;
  bankerPair: boolean;
}

function buildBigRoadColumns(data: RoadmapEntry[]): BigRoadCell[][] {
  const columns: BigRoadCell[][] = [];
  let currentCol: BigRoadCell[] = [];
  let lastResult: 'player' | 'banker' | null = null;

  for (const round of data) {
    if (round.result === 'tie') {
      if (currentCol.length > 0) {
        currentCol[currentCol.length - 1].tieCount++;
      } else if (columns.length > 0) {
        const prevCol = columns[columns.length - 1];
        prevCol[prevCol.length - 1].tieCount++;
      }
      continue;
    }
    const result = round.result as 'player' | 'banker';
    if (lastResult === null || result !== lastResult) {
      if (currentCol.length > 0) columns.push(currentCol);
      currentCol = [{ result, tieCount: 0, playerPair: round.playerPair, bankerPair: round.bankerPair }];
      lastResult = result;
    } else {
      currentCol.push({ result, tieCount: 0, playerPair: round.playerPair, bankerPair: round.bankerPair });
    }
  }
  if (currentCol.length > 0) columns.push(currentCol);
  return columns;
}

function buildBigRoadGrid(columns: BigRoadCell[][], rows: number, maxCols: number): (BigRoadCell | null)[][] {
  const grid: (BigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));
  let gridCol = 0;
  for (const column of columns) {
    let row = 0;
    for (const cell of column) {
      if (row >= rows) { row = rows - 1; gridCol++; }
      if (gridCol < maxCols) grid[row][gridCol] = cell;
      row++;
    }
    gridCol++;
  }
  return grid;
}

function buildDerivedRoad(columns: BigRoadCell[][], offset: number): ('red' | 'blue')[] {
  if (columns.length < offset + 1) return [];
  const results: ('red' | 'blue')[] = [];
  for (let colIdx = offset; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;
    const compareColLen = columns[colIdx - offset].length;
    for (let i = 0; i < currColLen; i++) {
      if (colIdx === offset && i === 0) continue;
      const depthSoFar = i + 1;
      let color: 'red' | 'blue';
      if (depthSoFar === 1) {
        color = compareColLen === 1 ? 'red' : 'blue';
      } else {
        color = depthSoFar <= compareColLen ? 'red' : 'blue';
      }
      results.push(color);
    }
  }
  return results;
}

export default function RoadmapModal({ isOpen, onClose, data }: RoadmapModalProps) {
  const { t } = useTranslation();
  const [activeRoad, setActiveRoad] = useState<RoadType>('bead');

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(data), [data]);

  const tabs: { type: RoadType; label: string }[] = [
    { type: 'bead', label: '珠盤路' },
    { type: 'big', label: '大路' },
    { type: 'bigEye', label: '大眼路' },
    { type: 'small', label: '小路' },
    { type: 'cockroach', label: '蟑螂路' },
  ];

  const renderBeadRoad = () => {
    const ROWS = 6;
    const cols = Math.max(Math.ceil(data.length / ROWS), 8);
    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-px" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 24px)`, backgroundColor: '#D1D5DB' }}>
          {Array(ROWS).fill(null).flatMap((_, row) =>
            Array(cols).fill(null).map((_, col) => {
              const idx = col * ROWS + row;
              const r = data[idx];
              if (!r) return <div key={`${row}-${col}`} className="w-6 h-6 bg-white" />;
              const bg = r.result === 'banker' ? '#DC2626' : r.result === 'player' ? '#2563EB' : '#16A34A';
              const label = r.result === 'banker' ? '莊' : r.result === 'player' ? '閒' : '和';
              return (
                <div key={`${row}-${col}`} className="relative w-6 h-6 flex items-center justify-center bg-white">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: bg, fontSize: '8px' }}>{label}</div>
                  {r.bankerPair && <div className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />}
                  {r.playerPair && <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2563EB' }} />}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderBigRoad = () => {
    const ROWS = 6;
    const maxCols = 30;
    const grid = buildBigRoadGrid(bigRoadColumns, ROWS, maxCols);
    let usedCols = 0;
    for (let c = 0; c < maxCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c]) usedCols = c + 1;
      }
    }
    const displayCols = Math.max(usedCols, 12);
    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-px" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)`, gridTemplateColumns: `repeat(${displayCols}, 24px)`, backgroundColor: '#D1D5DB' }}>
          {Array(ROWS).fill(null).flatMap((_, row) =>
            Array(displayCols).fill(null).map((_, col) => {
              const cell = grid[row]?.[col];
              if (!cell) return <div key={`${row}-${col}`} className="w-6 h-6 bg-white" />;
              const borderColor = cell.result === 'banker' ? '#DC2626' : '#2563EB';
              return (
                <div key={`${row}-${col}`} className="relative w-6 h-6 flex items-center justify-center bg-white">
                  <div className="w-5 h-5 rounded-full border-2" style={{ borderColor }}>
                    {cell.tieCount > 0 && (
                      <span className="flex items-center justify-center text-green-600 font-bold" style={{ fontSize: '7px' }}>{cell.tieCount}</span>
                    )}
                  </div>
                  {cell.bankerPair && <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />}
                  {cell.playerPair && <div className="absolute bottom-0 left-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2563EB' }} />}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderDerivedRoad = (type: 'bigEye' | 'small' | 'cockroach') => {
    const results = buildDerivedRoad(bigRoadColumns, type === 'bigEye' ? 1 : type === 'small' ? 2 : 3);
    const ROWS = 6;
    const cols = Math.max(Math.ceil(results.length / ROWS), 8);
    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-px" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 16px)`, backgroundColor: '#D1D5DB' }}>
          {Array(ROWS).fill(null).flatMap((_, row) =>
            Array(cols).fill(null).map((_, col) => {
              const idx = col * ROWS + row;
              const val = results[idx];
              if (!val) return <div key={`${row}-${col}`} className="w-4 h-4 bg-white" />;
              const color = val === 'red' ? '#DC2626' : '#2563EB';
              if (type === 'bigEye') {
                return <div key={`${row}-${col}`} className="w-4 h-4 flex items-center justify-center bg-white"><div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color }} /></div>;
              }
              if (type === 'small') {
                return <div key={`${row}-${col}`} className="w-4 h-4 flex items-center justify-center bg-white"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /></div>;
              }
              return <div key={`${row}-${col}`} className="w-4 h-4 flex items-center justify-center bg-white"><div className="w-3 h-0.5" style={{ backgroundColor: color, transform: val === 'red' ? 'rotate(45deg)' : 'rotate(-45deg)' }} /></div>;
            })
          )}
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
            className="bg-[#141922] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-gray-700/50"
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
            <div className="flex-1 p-3 overflow-auto">
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
