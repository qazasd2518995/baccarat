import { useMemo, memo, useRef, useState, useLayoutEffect } from 'react';
import {
  buildBigRoadColumns,
  buildBigRoadGrid,
  buildDerivedRoad,
  type RoadHistoryEntry,
  type BigRoadCell,
} from '../../utils/roadmap';

interface LobbyRoadmapProps {
  roadHistory: RoadHistoryEntry[];
  onAskRoadChange?: (mode: 'none' | 'banker' | 'player') => void;
}

/* Dark theme colors */
const CELL_BG = '#1e2433';
const LINE = '#2a3040';

// Calculate prediction for next result
function calculateNextPrediction(
  columns: BigRoadCell[][],
  nextResult: 'banker' | 'player'
): { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null } {
  if (columns.length === 0) {
    return { bigEye: null, small: null, cockroach: null };
  }

  const lastCol = columns[columns.length - 1];
  const lastResult = lastCol[0].result;

  let newColumns: BigRoadCell[][];
  if (nextResult === lastResult) {
    newColumns = [...columns.slice(0, -1), [...lastCol, { result: nextResult, tieCount: 0 }]];
  } else {
    newColumns = [...columns, [{ result: nextResult, tieCount: 0 }]];
  }

  const calcDerived = (offset: number): 'red' | 'blue' | null => {
    const startCol = offset + 1;
    if (newColumns.length < startCol) return null;

    const colIdx = newColumns.length - 1;
    const entryIdx = newColumns[colIdx].length - 1;

    if (colIdx === startCol - 1 && entryIdx === 0) return null;

    if (entryIdx === 0) {
      const prevColLen = newColumns[colIdx - 1].length;
      const refColIdx = colIdx - 1 - offset;
      const refColLen = refColIdx >= 0 ? newColumns[refColIdx].length : 0;
      return prevColLen === refColLen ? 'red' : 'blue';
    } else {
      const compareColIdx = colIdx - offset;
      const compareColLen = compareColIdx >= 0 ? newColumns[compareColIdx].length : 0;
      return compareColLen > entryIdx ? 'red' : (compareColLen === entryIdx ? 'blue' : 'red');
    }
  };

  return {
    bigEye: calcDerived(1),
    small: calcDerived(2),
    cockroach: calcDerived(3),
  };
}

// Statistics Panel with Ask Road buttons
function StatsPanel({
  data,
  nextBanker,
  nextPlayer,
  askRoadMode,
  onAskRoadToggle,
}: {
  data: RoadHistoryEntry[];
  nextBanker: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  nextPlayer: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  askRoadMode: 'none' | 'banker' | 'player';
  onAskRoadToggle: (mode: 'banker' | 'player') => void;
}) {
  const stats = useMemo(() => {
    let banker = 0, player = 0, tie = 0, bankerPair = 0, playerPair = 0;
    for (const entry of data) {
      if (entry.result === 'banker') banker++;
      else if (entry.result === 'player') player++;
      else if (entry.result === 'tie') tie++;
      if (entry.bankerPair) bankerPair++;
      if (entry.playerPair) playerPair++;
    }
    return { banker, player, tie, bankerPair, playerPair, total: data.length };
  }, [data]);

  const renderPredictionDots = (pred: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null }) => (
    <div className="flex items-center gap-0.5">
      {/* Big Eye - hollow circle */}
      <div
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          border: `1.5px solid ${pred.bigEye === 'red' ? '#ef4444' : pred.bigEye === 'blue' ? '#3b82f6' : '#666'}`,
        }}
      />
      {/* Small - solid circle */}
      <div
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: pred.small === 'red' ? '#ef4444' : pred.small === 'blue' ? '#3b82f6' : '#666',
        }}
      />
      {/* Cockroach - slash */}
      <div
        style={{
          width: 6,
          height: 1.5,
          backgroundColor: pred.cockroach === 'red' ? '#ef4444' : pred.cockroach === 'blue' ? '#3b82f6' : '#666',
          transform: 'rotate(-45deg)',
        }}
      />
    </div>
  );

  return (
    <div
      className="h-full flex flex-col px-1 py-0.5 text-[8px]"
      style={{ backgroundColor: CELL_BG, minWidth: 48 }}
    >
      {/* Stats */}
      <div className="flex-1 flex flex-col justify-center gap-0.5">
        <div className="flex items-center justify-between">
          <span style={{ color: '#ef4444' }}>莊</span>
          <span className="text-white font-medium">{stats.banker}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#3b82f6' }}>閒</span>
          <span className="text-white font-medium">{stats.player}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#22c55e' }}>和</span>
          <span className="text-white font-medium">{stats.tie}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#ef4444' }}>莊對</span>
          <span className="text-white font-medium">{stats.bankerPair}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#3b82f6' }}>閒對</span>
          <span className="text-white font-medium">{stats.playerPair}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-600 pt-0.5 mt-0.5">
          <span className="text-gray-400">總數</span>
          <span className="text-white font-medium">{stats.total}</span>
        </div>
      </div>

      {/* Ask Road Buttons */}
      <div className="border-t border-gray-600 pt-1 mt-1 space-y-1">
        {/* Banker Ask Road */}
        <button
          onClick={() => onAskRoadToggle('banker')}
          className={`w-full flex items-center justify-between px-1 py-0.5 rounded transition ${
            askRoadMode === 'banker' ? 'bg-red-500/30 ring-1 ring-red-400' : 'hover:bg-gray-700/50'
          }`}
        >
          <span style={{ color: '#ef4444' }}>莊問路</span>
          {renderPredictionDots(nextBanker)}
        </button>
        {/* Player Ask Road */}
        <button
          onClick={() => onAskRoadToggle('player')}
          className={`w-full flex items-center justify-between px-1 py-0.5 rounded transition ${
            askRoadMode === 'player' ? 'bg-blue-500/30 ring-1 ring-blue-400' : 'hover:bg-gray-700/50'
          }`}
        >
          <span style={{ color: '#3b82f6' }}>閒問路</span>
          {renderPredictionDots(nextPlayer)}
        </button>
      </div>
    </div>
  );
}

// Bead Road with prediction support
function BeadRoad({
  data,
  width,
  askRoadMode,
}: {
  data: RoadHistoryEntry[];
  width: number;
  askRoadMode: 'none' | 'banker' | 'player';
}) {
  const ROWS = 6;
  const CELL = 16;
  const cols = Math.max(Math.floor(width / (CELL + 1)), 1);

  // Reserve 1 slot for prediction when ask road is active
  const maxShow = askRoadMode !== 'none' ? ROWS * cols - 1 : ROWS * cols;
  const startIdx = Math.max(0, data.length - maxShow);
  const visibleData = data.slice(startIdx);

  const bgColors: Record<string, string> = {
    banker: '#ef4444',
    player: '#3b82f6',
    tie: '#22c55e',
  };
  const labels: Record<string, string> = {
    banker: '莊',
    player: '閒',
    tie: '和',
  };

  return (
    <div
      className="grid h-full"
      style={{
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoFlow: 'column',
        gap: '1px',
        backgroundColor: LINE,
      }}
    >
      {Array.from({ length: ROWS * cols }, (_, i) => {
        const col = Math.floor(i / ROWS);
        const row = i % ROWS;
        const dataIdx = col * ROWS + row;
        const key = `b-${row}-${col}`;

        // Check if this is the prediction slot
        const isPredictionSlot = askRoadMode !== 'none' && dataIdx === visibleData.length;

        if (isPredictionSlot) {
          const predResult = askRoadMode;
          return (
            <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
              <div
                className="rounded-full flex items-center justify-center text-white font-bold animate-pulse"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: bgColors[predResult],
                  fontSize: '8px',
                  lineHeight: 1,
                  opacity: 0.7,
                }}
              >
                {labels[predResult]}
              </div>
            </div>
          );
        }

        const entry = visibleData[dataIdx];
        if (!entry) return <div key={key} style={{ background: CELL_BG }} />;

        return (
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full flex items-center justify-center text-white font-bold"
              style={{
                width: 14,
                height: 14,
                backgroundColor: bgColors[entry.result],
                fontSize: '8px',
                lineHeight: 1,
              }}
            >
              {labels[entry.result]}
            </div>
            {entry.bankerPair && (
              <div className="absolute" style={{ top: 1, left: 1, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            )}
            {entry.playerPair && (
              <div className="absolute" style={{ bottom: 1, right: 1, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Big Road
function BigRoad({ grid, usedCols, width }: { grid: (BigRoadCell | null)[][]; usedCols: number; width: number }) {
  const ROWS = 6;
  const CELL = 12;
  const maxCols = Math.max(Math.floor(width / (CELL + 1)), 1);
  const displayCols = Math.max(usedCols, maxCols);
  const colOffset = Math.max(0, displayCols - maxCols);
  const visibleCols = Math.min(displayCols, maxCols);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < visibleCols; c++) {
      const cell = grid[r]?.[c + colOffset];
      const key = `br-${r}-${c}`;
      if (!cell) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }
      const color = cell.result === 'banker' ? '#ef4444' : '#3b82f6';
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 10, height: 10, border: `2px solid ${color}` }}
          >
            {cell.tieCount > 0 && (
              <span style={{ fontSize: '6px', color: '#22c55e', fontWeight: 'bold', lineHeight: 1 }}>
                {cell.tieCount}
              </span>
            )}
          </div>
          {cell.bankerPair && (
            <div className="absolute" style={{ top: 0, right: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          )}
          {cell.playerPair && (
            <div className="absolute" style={{ bottom: 0, left: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
          )}
        </div>
      );
    }
  }

  return (
    <div
      className="grid h-full"
      style={{
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${visibleCols}, 1fr)`,
        gap: '1px',
        backgroundColor: LINE,
      }}
    >
      {cells}
    </div>
  );
}

// Derived Road (Big Eye Boy, Small Road, Cockroach Pig)
function DerivedRoad({
  grid,
  cellSize,
  renderCell,
  keyPrefix,
  width,
}: {
  grid: ('red' | 'blue' | null)[][];
  cellSize: number;
  renderCell: (val: 'red' | 'blue') => React.ReactNode;
  keyPrefix: string;
  width: number;
}) {
  const ROWS = 6;
  const maxCols = Math.max(Math.floor(width / (cellSize + 1)), 1);
  let usedCols = 0;
  for (let c = 0; c < (grid[0]?.length ?? 0); c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r]?.[c]) usedCols = c + 1;
    }
  }
  const displayCols = Math.max(usedCols, maxCols);
  const colOffset = Math.max(0, displayCols - maxCols);
  const visibleCols = Math.min(displayCols, maxCols);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < visibleCols; c++) {
      const val = grid[r]?.[c + colOffset];
      const key = `${keyPrefix}-${r}-${c}`;
      if (!val) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
      } else {
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            {renderCell(val)}
          </div>
        );
      }
    }
  }

  return (
    <div
      className="grid h-full"
      style={{
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${visibleCols}, 1fr)`,
        gap: '1px',
        backgroundColor: LINE,
      }}
    >
      {cells}
    </div>
  );
}

// ── Main Component ──
function LobbyRoadmap({ roadHistory, onAskRoadChange }: LobbyRoadmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [askRoadMode, setAskRoadMode] = useState<'none' | 'banker' | 'player'>('none');

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleAskRoadToggle = (mode: 'banker' | 'player') => {
    const newMode = askRoadMode === mode ? 'none' : mode;
    setAskRoadMode(newMode);
    onAskRoadChange?.(newMode);
  };

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, 6, 60), [bigRoadColumns]);
  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, 6, 60), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, 6, 40), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, 6, 40), [bigRoadColumns]);

  const nextBanker = useMemo(() => calculateNextPrediction(bigRoadColumns, 'banker'), [bigRoadColumns]);
  const nextPlayer = useMemo(() => calculateNextPrediction(bigRoadColumns, 'player'), [bigRoadColumns]);

  let bigRoadUsedCols = 0;
  for (let c = 0; c < 60; c++) {
    for (let r = 0; r < 6; r++) {
      if (bigRoadGrid[r][c]) bigRoadUsedCols = c + 1;
    }
  }

  // Layout calculation
  const statsWidth = 52;
  const beadWidth = Math.floor((containerWidth - statsWidth - 2) * 0.22);
  const roadWidth = containerWidth - beadWidth - statsWidth - 2;
  const halfRoadWidth = Math.floor((roadWidth - 1) / 2);

  const renderBigEye = (val: 'red' | 'blue') => {
    const color = val === 'red' ? '#ef4444' : '#3b82f6';
    return <div className="rounded-full" style={{ width: 5, height: 5, border: `1.5px solid ${color}` }} />;
  };

  const renderSmall = (val: 'red' | 'blue') => {
    const color = val === 'red' ? '#ef4444' : '#3b82f6';
    return <div className="rounded-full" style={{ width: 5, height: 5, backgroundColor: color }} />;
  };

  const renderCockroach = (val: 'red' | 'blue') => {
    const color = val === 'red' ? '#ef4444' : '#3b82f6';
    return (
      <div style={{
        width: 6,
        height: 1.5,
        backgroundColor: color,
        transform: 'rotate(-45deg)',
      }} />
    );
  };

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden" style={{ gap: 1, backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Left: Bead Road */}
          <div className="shrink-0 overflow-hidden" style={{ width: beadWidth }}>
            <BeadRoad data={roadHistory} width={beadWidth} askRoadMode={askRoadMode} />
          </div>

          {/* Middle: Big Road + Derived Roads */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: 1, backgroundColor: LINE }}>
            {/* Big Road - takes ~40% height */}
            <div className="flex-[3] overflow-hidden">
              <BigRoad grid={bigRoadGrid} usedCols={bigRoadUsedCols} width={roadWidth} />
            </div>

            {/* Big Eye Boy - takes ~30% height */}
            <div className="flex-[2] overflow-hidden">
              <DerivedRoad grid={bigEyeGrid} cellSize={7} renderCell={renderBigEye} keyPrefix="be" width={roadWidth} />
            </div>

            {/* Small Road + Cockroach Pig side by side - takes ~30% height */}
            <div className="flex-[2] flex overflow-hidden" style={{ gap: 1 }}>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={smallGrid} cellSize={7} renderCell={renderSmall} keyPrefix="sr" width={halfRoadWidth} />
              </div>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={cockroachGrid} cellSize={7} renderCell={renderCockroach} keyPrefix="cr" width={halfRoadWidth} />
              </div>
            </div>
          </div>

          {/* Right: Stats Panel */}
          <div className="shrink-0 overflow-hidden" style={{ width: statsWidth }}>
            <StatsPanel
              data={roadHistory}
              nextBanker={nextBanker}
              nextPlayer={nextPlayer}
              askRoadMode={askRoadMode}
              onAskRoadToggle={handleAskRoadToggle}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
