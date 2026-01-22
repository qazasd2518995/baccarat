import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { GameRound, GameResult } from '../../types';

interface RoadmapProps {
  data: GameRound[];
}

type RoadType = 'bead' | 'big' | 'bigEye' | 'small' | 'cockroach';

const ROAD_TABS: { type: RoadType; label: string }[] = [
  { type: 'bead', label: 'beadRoad' },
  { type: 'big', label: 'bigRoad' },
  { type: 'bigEye', label: 'bigEyeRoad' },
  { type: 'small', label: 'smallRoad' },
  { type: 'cockroach', label: 'cockroachRoad' },
];

const RESULT_COLORS: Record<GameResult, string> = {
  banker: 'bg-red-500',
  player: 'bg-blue-500',
  tie: 'bg-green-500',
};

const RESULT_BORDERS: Record<GameResult, string> = {
  banker: 'border-red-400',
  player: 'border-blue-400',
  tie: 'border-green-400',
};

export default function Roadmap({ data }: RoadmapProps) {
  const { t } = useTranslation();
  const [activeRoad, setActiveRoad] = useState<RoadType>('bead');

  // Bead Road: Simple grid, top to bottom, left to right
  const renderBeadRoad = () => {
    const rows = 6;
    const cols = Math.ceil(data.length / rows) || 10;
    const grid: (GameRound | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

    data.forEach((round, index) => {
      const col = Math.floor(index / rows);
      const row = index % rows;
      if (col < cols) {
        grid[row][col] = round;
      }
    });

    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5">
              {row.map((cell, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  initial={cell ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold
                    ${cell ? RESULT_COLORS[cell.result] : 'bg-slate-700/30'}
                    ${cell?.playerPair ? 'ring-1 ring-blue-400 ring-offset-1 ring-offset-slate-900' : ''}
                    ${cell?.bankerPair ? 'ring-1 ring-red-400 ring-offset-1 ring-offset-slate-900' : ''}
                  `}
                >
                  {cell && (
                    <span className="text-white">
                      {cell.result === 'banker' ? 'B' : cell.result === 'player' ? 'P' : 'T'}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Big Road: Standard baccarat big road
  const renderBigRoad = () => {
    const rows = 6;
    const maxCols = 30;
    const grid: (GameRound | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));

    let col = 0;
    let row = 0;
    let lastResult: GameResult | null = null;

    // Filter out ties for main positioning (ties go on previous cell)
    const nonTieData = data.filter(r => r.result !== 'tie');

    nonTieData.forEach((round) => {
      if (lastResult === null || round.result !== lastResult) {
        // New column
        if (lastResult !== null) {
          col++;
          row = 0;
        }
        lastResult = round.result;
      } else {
        // Same result, go down
        row++;
        if (row >= rows) {
          // Dragon tail: go right
          row = rows - 1;
          col++;
        }
      }

      if (col < maxCols) {
        grid[row][col] = round;
      }
    });

    const usedCols = col + 1;

    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {grid.map((rowData, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5">
              {rowData.slice(0, Math.max(usedCols, 15)).map((cell, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  initial={cell ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center
                    ${cell ? `border-2 ${RESULT_BORDERS[cell.result]} bg-transparent` : 'bg-slate-700/20'}
                  `}
                >
                  {cell && (
                    <>
                      {/* Pair indicators */}
                      {cell.playerPair && (
                        <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                      {cell.bankerPair && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-400" />
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Derived roads (simplified version)
  const renderDerivedRoad = (offset: number) => {
    const rows = 6;
    const cols = 20;
    const grid: ('red' | 'blue' | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

    // Simplified derived road logic
    const nonTieData = data.filter(r => r.result !== 'tie');

    let col = 0;
    let row = 0;
    let lastColor: 'red' | 'blue' | null = null;

    nonTieData.forEach((round, index) => {
      if (index < offset + 1) return;

      const compareIndex = index - offset - 1;
      const compareRound = nonTieData[compareIndex];

      if (!compareRound) return;

      // Compare if same result
      const isSame = round.result === compareRound.result;
      const color: 'red' | 'blue' = isSame ? 'red' : 'blue';

      if (lastColor === null || color !== lastColor) {
        if (lastColor !== null) {
          col++;
          row = 0;
        }
        lastColor = color;
      } else {
        row++;
        if (row >= rows) {
          row = rows - 1;
          col++;
        }
      }

      if (col < cols && row < rows) {
        grid[row][col] = color;
      }
    });

    const usedCols = col + 1;

    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {grid.map((rowData, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5">
              {rowData.slice(0, Math.max(usedCols, 10)).map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-3 h-3 rounded-full
                    ${cell === 'red' ? 'bg-red-500' : cell === 'blue' ? 'bg-blue-500' : 'bg-slate-700/20'}
                  `}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col rounded-2xl bg-slate-800/30 border border-slate-700/30 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/30">
        {ROAD_TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveRoad(tab.type)}
            className={`
              flex-1 px-2 py-2 text-xs font-medium transition-colors
              ${activeRoad === tab.type
                ? 'bg-slate-700/50 text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }
            `}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Road Content */}
      <div className="flex-1 p-3 overflow-auto">
        {activeRoad === 'bead' && renderBeadRoad()}
        {activeRoad === 'big' && renderBigRoad()}
        {activeRoad === 'bigEye' && renderDerivedRoad(1)}
        {activeRoad === 'small' && renderDerivedRoad(2)}
        {activeRoad === 'cockroach' && renderDerivedRoad(3)}
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-slate-700/30 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400">{t('banker')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-400">{t('player')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-400">{t('tie')}</span>
        </div>
      </div>
    </div>
  );
}
