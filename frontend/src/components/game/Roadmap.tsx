import { useState, useMemo } from 'react';
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

// Big Road cell with tie count
interface BigRoadCell {
  result: 'player' | 'banker';
  tieCount: number;
  playerPair?: boolean;
  bankerPair?: boolean;
}

// Build Big Road column structure from data
function buildBigRoadColumns(data: GameRound[]): BigRoadCell[][] {
  const columns: BigRoadCell[][] = [];
  let currentCol: BigRoadCell[] = [];
  let lastResult: 'player' | 'banker' | null = null;

  for (const round of data) {
    if (round.result === 'tie') {
      // Attach tie to previous non-tie cell
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
      // New column
      if (currentCol.length > 0) {
        columns.push(currentCol);
      }
      currentCol = [{
        result,
        tieCount: 0,
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
      }];
      lastResult = result;
    } else {
      // Same result, extend column
      currentCol.push({
        result,
        tieCount: 0,
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
      });
    }
  }

  if (currentCol.length > 0) {
    columns.push(currentCol);
  }

  return columns;
}

// Build Big Road grid from columns (with dragon tail)
function buildBigRoadGrid(columns: BigRoadCell[][], rows: number, maxCols: number): (BigRoadCell | null)[][] {
  const grid: (BigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));

  let gridCol = 0;

  for (const column of columns) {
    let row = 0;
    for (const cell of column) {
      if (row >= rows) {
        // Dragon tail: go right
        row = rows - 1;
        gridCol++;
      }
      if (gridCol < maxCols) {
        grid[row][gridCol] = cell;
      }
      row++;
    }
    gridCol++;
  }

  return grid;
}

// Build derived road using Big Road column structure analysis
function buildDerivedRoad(columns: BigRoadCell[][], offset: number): ('red' | 'blue' | null)[][] {
  const ROWS = 6;
  const COLS = 20;
  const grid: ('red' | 'blue' | null)[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

  // We need at least (offset + 1) columns to start
  if (columns.length < offset + 1) return grid;

  let outputCol = 0;
  let outputRow = 0;
  let lastColor: 'red' | 'blue' | null = null;

  // For each column starting from (offset), compare with column (col - offset)
  for (let colIdx = offset; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;
    const compareColLen = columns[colIdx - offset].length;

    // For each entry in the current column
    for (let i = 0; i < currColLen; i++) {
      // Skip first entry of the first compared column
      if (colIdx === offset && i === 0) continue;

      const depthSoFar = i + 1;

      let color: 'red' | 'blue';
      if (depthSoFar === 1) {
        // First entry in column: red if compare column also had length 1, blue otherwise
        color = compareColLen === 1 ? 'red' : 'blue';
      } else {
        // Subsequent entries: red if current depth <= compare column depth (pattern continues)
        color = depthSoFar <= compareColLen ? 'red' : 'blue';
      }

      // Place in grid (Big Road style columns)
      if (lastColor !== null && color !== lastColor) {
        outputCol++;
        outputRow = 0;
      } else if (lastColor !== null) {
        outputRow++;
        if (outputRow >= ROWS) {
          outputRow = ROWS - 1;
          outputCol++;
        }
      }

      if (outputCol < COLS && outputRow < ROWS) {
        grid[outputRow][outputCol] = color;
        lastColor = color;
      }
    }
  }

  return grid;
}

export default function Roadmap({ data }: RoadmapProps) {
  const { t } = useTranslation();
  const [activeRoad, setActiveRoad] = useState<RoadType>('bead');

  // Build Big Road columns once for use in all derived roads
  const bigRoadColumns = useMemo(() => buildBigRoadColumns(data), [data]);

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
                      {cell.result === 'banker' ? t('roadBanker') : cell.result === 'player' ? t('roadPlayer') : t('roadTie')}
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

  // Big Road: Standard baccarat big road with tie markers
  const renderBigRoad = () => {
    const rows = 6;
    const maxCols = 30;
    const grid = buildBigRoadGrid(bigRoadColumns, rows, maxCols);

    // Find last used column
    let usedCols = 0;
    for (let c = 0; c < maxCols; c++) {
      for (let r = 0; r < rows; r++) {
        if (grid[r][c]) usedCols = c + 1;
      }
    }

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
                    relative w-5 h-5 rounded-full flex items-center justify-center
                    ${cell ? `border-2 ${RESULT_BORDERS[cell.result]} bg-transparent` : 'bg-slate-700/20'}
                  `}
                >
                  {cell && (
                    <>
                      {/* Tie indicator - green line/count */}
                      {cell.tieCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[7px] font-bold text-green-400">{cell.tieCount}</span>
                        </div>
                      )}
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

  // Derived roads using column structure analysis
  const renderDerivedRoad = (offset: number) => {
    const grid = buildDerivedRoad(bigRoadColumns, offset);
    const ROWS = 6;

    // Find last used column
    let usedCols = 0;
    for (let c = 0; c < 20; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c]) usedCols = c + 1;
      }
    }

    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
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
