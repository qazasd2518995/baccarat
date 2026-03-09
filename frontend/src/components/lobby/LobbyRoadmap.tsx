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
}

/* Dark theme colors */
const CELL_BG = '#1e2433';
const LINE = '#2a3040';

const GLOW_COLORS: Record<string, string> = {
  banker: 'rgba(239,68,68,0.4)',
  player: 'rgba(59,130,246,0.4)',
  tie: 'rgba(34,197,94,0.4)',
};

// Statistics Panel - Right side summary
function StatsPanel({ data, nextBanker, nextPlayer }: {
  data: RoadHistoryEntry[];
  nextBanker: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  nextPlayer: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
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

  const renderPrediction = (bigEye: 'red' | 'blue' | null, small: 'red' | 'blue' | null, cockroach: 'red' | 'blue' | null) => (
    <div className="flex items-center gap-0.5">
      {/* Big Eye - hollow circle */}
      <div
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          border: `1.5px solid ${bigEye === 'red' ? '#ef4444' : bigEye === 'blue' ? '#3b82f6' : '#666'}`,
        }}
      />
      {/* Small - solid circle */}
      <div
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: small === 'red' ? '#ef4444' : small === 'blue' ? '#3b82f6' : '#666',
        }}
      />
      {/* Cockroach - slash */}
      <div
        style={{
          width: 6,
          height: 1.5,
          backgroundColor: cockroach === 'red' ? '#ef4444' : cockroach === 'blue' ? '#3b82f6' : '#666',
          transform: 'rotate(-45deg)',
        }}
      />
    </div>
  );

  return (
    <div
      className="h-full flex flex-col justify-center px-1.5 py-1 text-[8px]"
      style={{ backgroundColor: CELL_BG, minWidth: 50 }}
    >
      {/* Banker */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#ef4444' }}>莊</span>
        <span className="text-white font-medium">{stats.banker}</span>
      </div>
      {/* Player */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#3b82f6' }}>閒</span>
        <span className="text-white font-medium">{stats.player}</span>
      </div>
      {/* Tie */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#22c55e' }}>和</span>
        <span className="text-white font-medium">{stats.tie}</span>
      </div>
      {/* Banker Pair */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#ef4444' }}>莊對</span>
        <span className="text-white font-medium">{stats.bankerPair}</span>
      </div>
      {/* Player Pair */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#3b82f6' }}>閒對</span>
        <span className="text-white font-medium">{stats.playerPair}</span>
      </div>
      {/* Total */}
      <div className="flex items-center justify-between gap-1 border-t border-gray-600 pt-0.5 mt-0.5">
        <span className="text-gray-400">總數</span>
        <span className="text-white font-medium">{stats.total}</span>
      </div>
      {/* Prediction - Next Banker */}
      <div className="flex items-center justify-between gap-1 border-t border-gray-600 pt-0.5 mt-0.5">
        <span style={{ color: '#ef4444' }}>莊問路</span>
        {renderPrediction(nextBanker.bigEye, nextBanker.small, nextBanker.cockroach)}
      </div>
      {/* Prediction - Next Player */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#3b82f6' }}>閒問路</span>
        {renderPrediction(nextPlayer.bigEye, nextPlayer.small, nextPlayer.cockroach)}
      </div>
    </div>
  );
}

// Bead Road — solid glowing circles on dark background
function BeadRoad({ data, width }: { data: RoadHistoryEntry[]; width: number }) {
  const ROWS = 6;
  const CELL = 15;
  const cols = Math.max(Math.floor(width / (CELL + 1)), 1);
  const startIdx = Math.max(0, data.length - ROWS * cols);
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
        const entry = visibleData[dataIdx];
        const key = `b-${row}-${col}`;
        if (!entry) return <div key={key} style={{ background: CELL_BG }} />;
        return (
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full flex items-center justify-center text-white font-bold"
              style={{
                width: 13,
                height: 13,
                backgroundColor: bgColors[entry.result],
                fontSize: '7px',
                lineHeight: 1,
                boxShadow: `0 0 4px ${GLOW_COLORS[entry.result]}`,
              }}
            >
              {labels[entry.result]}
            </div>
            {entry.bankerPair && (
              <div className="absolute" style={{ top: 0, left: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            )}
            {entry.playerPair && (
              <div className="absolute" style={{ bottom: 0, right: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Big Road — outlined glowing circles on dark background
function BigRoad({ grid, usedCols, width }: { grid: (BigRoadCell | null)[][]; usedCols: number; width: number }) {
  const ROWS = 6;
  const CELL = 13;
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
      const glow = cell.result === 'banker' ? GLOW_COLORS.banker : GLOW_COLORS.player;
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 10, height: 10, border: `2px solid ${color}`, boxShadow: `0 0 3px ${glow}` }}
          >
            {cell.tieCount > 0 && (
              <span style={{ fontSize: '5px', color: '#22c55e', fontWeight: 'bold', lineHeight: 1 }}>
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

// Generic derived road component (Big Eye Boy, Small Road, Cockroach Pig)
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

// Calculate prediction for next result
function calculateNextPrediction(
  columns: BigRoadCell[][],
  nextResult: 'banker' | 'player'
): { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null } {
  if (columns.length === 0) {
    return { bigEye: null, small: null, cockroach: null };
  }

  // Simulate adding the next result
  const lastCol = columns[columns.length - 1];
  const lastResult = lastCol[0].result;

  let newColumns: BigRoadCell[][];
  if (nextResult === lastResult) {
    // Continue in same column
    newColumns = [...columns.slice(0, -1), [...lastCol, { result: nextResult, tieCount: 0 }]];
  } else {
    // Start new column
    newColumns = [...columns, [{ result: nextResult, tieCount: 0 }]];
  }

  // Calculate derived road colors for the new entry
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

// ── Main Component ──

function LobbyRoadmap({ roadHistory }: LobbyRoadmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, 6, 60), [bigRoadColumns]);
  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, 6, 60), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, 6, 40), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, 6, 40), [bigRoadColumns]);

  // Calculate predictions
  const nextBanker = useMemo(() => calculateNextPrediction(bigRoadColumns, 'banker'), [bigRoadColumns]);
  const nextPlayer = useMemo(() => calculateNextPrediction(bigRoadColumns, 'player'), [bigRoadColumns]);

  let bigRoadUsedCols = 0;
  for (let c = 0; c < 60; c++) {
    for (let r = 0; r < 6; r++) {
      if (bigRoadGrid[r][c]) bigRoadUsedCols = c + 1;
    }
  }

  // Stats panel width
  const statsWidth = 55;
  // Bead road ~30%, roads ~remaining
  const beadWidth = Math.floor((containerWidth - statsWidth - 2) * 0.30);
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
    // All slashes same direction (top-left to bottom-right)
    return (
      <div style={{
        width: 5,
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
            <BeadRoad data={roadHistory} width={beadWidth} />
          </div>

          {/* 1px vertical divider */}
          <div style={{ width: 1, backgroundColor: LINE }} />

          {/* Middle: Stacked roads */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: 1, backgroundColor: LINE }}>
            {/* Big Road */}
            <div className="flex-[3] overflow-hidden">
              <BigRoad grid={bigRoadGrid} usedCols={bigRoadUsedCols} width={roadWidth} />
            </div>

            {/* Big Eye Boy */}
            <div className="flex-[2] overflow-hidden">
              <DerivedRoad grid={bigEyeGrid} cellSize={7} renderCell={renderBigEye} keyPrefix="be" width={roadWidth} />
            </div>

            {/* Small Road + Cockroach Pig */}
            <div className="flex-[2] flex overflow-hidden" style={{ gap: 1 }}>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={smallGrid} cellSize={7} renderCell={renderSmall} keyPrefix="sr" width={halfRoadWidth} />
              </div>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={cockroachGrid} cellSize={7} renderCell={renderCockroach} keyPrefix="cr" width={halfRoadWidth} />
              </div>
            </div>
          </div>

          {/* 1px vertical divider */}
          <div style={{ width: 1, backgroundColor: LINE }} />

          {/* Right: Stats Panel */}
          <div className="shrink-0 overflow-hidden" style={{ width: statsWidth }}>
            <StatsPanel data={roadHistory} nextBanker={nextBanker} nextPlayer={nextPlayer} />
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
