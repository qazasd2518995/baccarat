import { useMemo, memo, useRef, useState, useLayoutEffect } from 'react';
import {
  buildBigRoadColumns,
  buildBigRoadGrid,
  buildDerivedRoad,
  buildBeadRoadGrid,
  type RoadHistoryEntry,
  type BigRoadCell,
} from '../../utils/roadmap';

interface LobbyRoadmapProps {
  roadHistory: RoadHistoryEntry[];
  predictedCount?: number;
  askRoadMode?: 'none' | 'banker' | 'player';
  onToggleAskRoad?: (mode: 'banker' | 'player') => void;
  /** Pre-computed ask road predictions from parent */
  bankerAskPrediction?: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  playerAskPrediction?: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
}

const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB';
const LARGE_COLS = 200;

// ── Bead Road (珠盤路) ──
function BeadRoad({ grid, rows, cols, totalEntries, predictedCount }: {
  grid: (RoadHistoryEntry | null)[][];
  rows: number;
  cols: number;
  totalEntries: number;
  predictedCount: number;
}) {
  const totalGridCols = grid[0]?.length ?? 0;
  const colOffset = Math.max(0, totalGridCols - cols);
  const realCount = totalEntries - predictedCount;

  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const entry = grid[r]?.[c + colOffset] ?? null;
      const key = `bead-${r}-${c}`;
      if (!entry) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }

      const absCol = c + colOffset;
      const entryIndex = absCol * rows + r;
      const isPredicted = predictedCount > 0 && entryIndex >= realCount;

      let bgColor = '#FFFFFF', text = '';
      if (entry.result === 'banker') { bgColor = '#DC2626'; text = '莊'; }
      else if (entry.result === 'player') { bgColor = '#2563EB'; text = '閒'; }
      else if (entry.result === 'tie') { bgColor = '#16A34A'; text = '和'; }

      const blinkStyle = isPredicted ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full flex items-center justify-center w-full aspect-square max-w-[14px]"
            style={{ backgroundColor: bgColor, ...blinkStyle }}
          >
            <span style={{ color: '#FFFFFF', fontSize: '6px', fontWeight: 'bold', lineHeight: 1 }}>{text}</span>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="grid h-full w-full" style={{
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridAutoFlow: 'column',
      gap: '1px',
      backgroundColor: LINE,
    }}>
      {cells}
    </div>
  );
}

// ── Big Road (大路) ──
function BigRoad({ grid, rows, cols, predictedCells }: {
  grid: (BigRoadCell | null)[][];
  rows: number;
  cols: number;
  predictedCells?: Set<string>;
}) {
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cell = grid[r]?.[c] ?? null;
      const key = `br-${r}-${c}`;
      if (!cell) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }

      const borderColor = cell.result === 'banker' ? '#DC2626' : '#2563EB';
      const isPredicted = predictedCells?.has(`${r}-${c}`) ?? false;
      const blinkStyle = isPredicted ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};

      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full" style={{ width: 9, height: 9, border: `1.5px solid ${borderColor}`, ...blinkStyle }} />
          {cell.tieCount > 0 && (
            <div className="absolute" style={{
              width: 8, height: '1px', backgroundColor: '#16A34A',
              top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)',
            }} />
          )}
        </div>
      );
    }
  }

  return (
    <div className="grid h-full w-full" style={{
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridAutoFlow: 'column',
      gap: '1px',
      backgroundColor: LINE,
    }}>
      {cells}
    </div>
  );
}

// ── Derived Road (下三路) ── uses 2x2 mini cells per grid cell
function DerivedRoadGrid({ grid, type, rows, cols, predictedCells }: {
  grid: ('red' | 'blue' | null)[][];
  type: 'big_eye' | 'small' | 'cockroach';
  rows: number;
  cols: number;
  predictedCells?: Set<string>;
}) {
  const gridRows = Math.ceil(rows / 2);
  const gridCols = Math.ceil(cols / 2);
  const gridCells: React.ReactNode[] = [];

  for (let gc = 0; gc < gridCols; gc++) {
    for (let gr = 0; gr < gridRows; gr++) {
      const key = `grid-${gr}-${gc}`;
      const miniCells: React.ReactNode[] = [];
      for (let mr = 0; mr < 2; mr++) {
        for (let mc = 0; mc < 2; mc++) {
          const dataRow = gr * 2 + mr;
          const dataCol = gc * 2 + mc;
          const value = grid[dataRow]?.[dataCol] ?? null;
          const miniKey = `mini-${mr}-${mc}`;
          if (!value) { miniCells.push(<div key={miniKey} />); continue; }

          const isPred = predictedCells?.has(`${dataRow}-${dataCol}`) ?? false;
          const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
          const color = value === 'red' ? '#DC2626' : '#2563EB';

          if (type === 'big_eye') {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <div className="rounded-full" style={{ width: 5, height: 5, border: `1px solid ${color}`, ...blinkStyle }} />
              </div>
            );
          } else if (type === 'small') {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <div className="rounded-full" style={{ width: 5, height: 5, backgroundColor: color, ...blinkStyle }} />
              </div>
            );
          } else {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center" style={blinkStyle}>
                <svg viewBox="0 0 10 10" style={{ width: 6, height: 6 }}>
                  <line x1="1" y1="9" x2="9" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            );
          }
        }
      }
      gridCells.push(
        <div key={key} className="grid" style={{ gridTemplateRows: 'repeat(2, 1fr)', gridTemplateColumns: 'repeat(2, 1fr)', background: CELL_BG }}>
          {miniCells}
        </div>
      );
    }
  }

  return (
    <div className="grid h-full w-full" style={{
      gridTemplateRows: `repeat(${gridRows}, 1fr)`,
      gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
      gridAutoFlow: 'column',
      gap: '1px',
      backgroundColor: LINE,
    }}>
      {gridCells}
    </div>
  );
}

// ── Prediction indicator ──
function PredictionDots({ bigEye, small, cockroach }: {
  bigEye: 'red' | 'blue' | null;
  small: 'red' | 'blue' | null;
  cockroach: 'red' | 'blue' | null;
}) {
  const c = (v: 'red' | 'blue' | null) => v === 'red' ? '#ef4444' : v === 'blue' ? '#3b82f6' : '#999';
  return (
    <span className="inline-flex items-center gap-px ml-0.5">
      <span className="inline-block rounded-full" style={{ width: 5, height: 5, border: `1px solid ${c(bigEye)}` }} />
      <span className="inline-block rounded-full" style={{ width: 5, height: 5, backgroundColor: c(small) }} />
      <span className="inline-block" style={{ width: 5, height: 1.5, backgroundColor: c(cockroach), transform: 'rotate(-45deg)' }} />
    </span>
  );
}

// ── Main Component ──
function LobbyRoadmap({
  roadHistory,
  predictedCount = 0,
  askRoadMode,
  onToggleAskRoad,
  bankerAskPrediction,
  playerAskPrediction,
}: LobbyRoadmapProps) {
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

  const isNarrow = containerWidth > 0 && containerWidth < 350;
  const BEAD_ROWS = 6;
  const BEAD_COLS = isNarrow ? 6 : 8;
  const BIG_ROAD_ROWS = 6;
  const BIG_ROAD_COLS = isNarrow ? 18 : 24;
  const DERIVED_ROWS = 6;
  const DERIVED_COLS = isNarrow ? 10 : 14;

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGridLarge = useMemo(() => buildBigRoadGrid(bigRoadColumns, BIG_ROAD_ROWS, LARGE_COLS), [bigRoadColumns]);
  const beadRoadGrid = useMemo(() => buildBeadRoadGrid(roadHistory, BEAD_ROWS), [roadHistory]);

  const realHistory = useMemo(() => predictedCount > 0 ? roadHistory.slice(0, -predictedCount) : roadHistory, [roadHistory, predictedCount]);
  const realBigRoadColumns = useMemo(() => predictedCount > 0 ? buildBigRoadColumns(realHistory) : bigRoadColumns, [realHistory, predictedCount, bigRoadColumns]);
  const realBigRoadGridLarge = useMemo(() => predictedCount > 0 ? buildBigRoadGrid(realBigRoadColumns, BIG_ROAD_ROWS, LARGE_COLS) : bigRoadGridLarge, [realBigRoadColumns, predictedCount, bigRoadGridLarge]);

  // Big road sliding window
  let maxUsedCol = 0;
  for (let c = 0; c < LARGE_COLS; c++) {
    for (let r = 0; r < BIG_ROAD_ROWS; r++) {
      if (bigRoadGridLarge[r]?.[c]) maxUsedCol = c;
    }
  }
  const bigRoadColOffset = Math.max(0, maxUsedCol - BIG_ROAD_COLS + 1);

  const bigRoadGrid = useMemo(() => {
    const grid: (BigRoadCell | null)[][] = Array(BIG_ROAD_ROWS).fill(null).map(() => Array(BIG_ROAD_COLS).fill(null));
    for (let r = 0; r < BIG_ROAD_ROWS; r++) {
      for (let c = 0; c < BIG_ROAD_COLS; c++) {
        grid[r][c] = bigRoadGridLarge[r]?.[c + bigRoadColOffset] ?? null;
      }
    }
    return grid;
  }, [bigRoadGridLarge, bigRoadColOffset, BIG_ROAD_COLS]);

  const bigRoadPredictedCells = useMemo(() => {
    if (predictedCount === 0) return undefined;
    const predicted = new Set<string>();
    for (let r = 0; r < BIG_ROAD_ROWS; r++) {
      for (let c = 0; c < LARGE_COLS; c++) {
        if (bigRoadGridLarge[r]?.[c] && !realBigRoadGridLarge[r]?.[c]) {
          const windowCol = c - bigRoadColOffset;
          if (windowCol >= 0 && windowCol < BIG_ROAD_COLS) predicted.add(`${r}-${windowCol}`);
        }
      }
    }
    return predicted.size > 0 ? predicted : undefined;
  }, [bigRoadGridLarge, realBigRoadGridLarge, predictedCount, bigRoadColOffset, BIG_ROAD_COLS]);

  // Derived roads
  const bigEyeGridLarge = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, DERIVED_ROWS, LARGE_COLS), [bigRoadColumns]);
  const smallGridLarge = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, DERIVED_ROWS, LARGE_COLS), [bigRoadColumns]);
  const cockroachGridLarge = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, DERIVED_ROWS, LARGE_COLS), [bigRoadColumns]);

  const realBigEyeGridLarge = useMemo(() => predictedCount > 0 ? buildDerivedRoad(realBigRoadColumns, 1, DERIVED_ROWS, LARGE_COLS) : bigEyeGridLarge, [realBigRoadColumns, predictedCount, bigEyeGridLarge]);
  const realSmallGridLarge = useMemo(() => predictedCount > 0 ? buildDerivedRoad(realBigRoadColumns, 2, DERIVED_ROWS, LARGE_COLS) : smallGridLarge, [realBigRoadColumns, predictedCount, smallGridLarge]);
  const realCockroachGridLarge = useMemo(() => predictedCount > 0 ? buildDerivedRoad(realBigRoadColumns, 3, DERIVED_ROWS, LARGE_COLS) : cockroachGridLarge, [realBigRoadColumns, predictedCount, cockroachGridLarge]);

  const extractWindow = (large: ('red' | 'blue' | null)[][], cols: number) => {
    let maxC = 0;
    for (let c = 0; c < LARGE_COLS; c++) {
      for (let r = 0; r < DERIVED_ROWS; r++) {
        if (large[r]?.[c]) maxC = c;
      }
    }
    const offset = Math.max(0, maxC - cols + 1);
    const grid: ('red' | 'blue' | null)[][] = Array(DERIVED_ROWS).fill(null).map(() => Array(cols).fill(null));
    for (let r = 0; r < DERIVED_ROWS; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] = large[r]?.[c + offset] ?? null;
      }
    }
    return { grid, offset };
  };

  const { grid: bigEyeGrid, offset: bigEyeOffset } = useMemo(() => extractWindow(bigEyeGridLarge, DERIVED_COLS), [bigEyeGridLarge, DERIVED_COLS]);
  const { grid: smallGrid, offset: smallOffset } = useMemo(() => extractWindow(smallGridLarge, DERIVED_COLS), [smallGridLarge, DERIVED_COLS]);
  const { grid: cockroachGrid, offset: cockroachOffset } = useMemo(() => extractWindow(cockroachGridLarge, DERIVED_COLS), [cockroachGridLarge, DERIVED_COLS]);

  const buildDerivedPredictedCells = (full: ('red' | 'blue' | null)[][], real: ('red' | 'blue' | null)[][], offset: number, cols: number): Set<string> | undefined => {
    if (predictedCount === 0) return undefined;
    const predicted = new Set<string>();
    for (let r = 0; r < DERIVED_ROWS; r++) {
      for (let c = 0; c < LARGE_COLS; c++) {
        if (full[r]?.[c] && !real[r]?.[c]) {
          const windowCol = c - offset;
          if (windowCol >= 0 && windowCol < cols) predicted.add(`${r}-${windowCol}`);
        }
      }
    }
    return predicted.size > 0 ? predicted : undefined;
  };

  const bigEyePredCells = useMemo(() => buildDerivedPredictedCells(bigEyeGridLarge, realBigEyeGridLarge, bigEyeOffset, DERIVED_COLS), [bigEyeGridLarge, realBigEyeGridLarge, bigEyeOffset, DERIVED_COLS, predictedCount]);
  const smallPredCells = useMemo(() => buildDerivedPredictedCells(smallGridLarge, realSmallGridLarge, smallOffset, DERIVED_COLS), [smallGridLarge, realSmallGridLarge, smallOffset, DERIVED_COLS, predictedCount]);
  const cockroachPredCells = useMemo(() => buildDerivedPredictedCells(cockroachGridLarge, realCockroachGridLarge, cockroachOffset, DERIVED_COLS), [cockroachGridLarge, realCockroachGridLarge, cockroachOffset, DERIVED_COLS, predictedCount]);

  // Stats
  const stats = useMemo(() => {
    const h = predictedCount > 0 ? roadHistory.slice(0, -predictedCount) : roadHistory;
    let banker = 0, player = 0, tie = 0;
    for (const e of h) {
      if (e.result === 'banker') banker++;
      else if (e.result === 'player') player++;
      else if (e.result === 'tie') tie++;
    }
    return { banker, player, tie, total: h.length };
  }, [roadHistory, predictedCount]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Roads area */}
          <div className="flex-1 flex" style={{ gap: '1px' }}>
            {/* Bead Road (珠盤路) ~15% */}
            <div className="h-full shrink-0" style={{ width: '15%', borderRight: `1px solid ${LINE}` }}>
              <BeadRoad grid={beadRoadGrid} rows={BEAD_ROWS} cols={BEAD_COLS} totalEntries={roadHistory.length} predictedCount={predictedCount} />
            </div>

            {/* Big Road (大路) ~50% */}
            <div className="h-full" style={{ width: '50%', borderRight: `1px solid ${LINE}` }}>
              <BigRoad grid={bigRoadGrid} rows={BIG_ROAD_ROWS} cols={BIG_ROAD_COLS} predictedCells={bigRoadPredictedCells} />
            </div>

            {/* Derived Roads (下三路) ~35% */}
            <div className="flex-1 flex flex-col h-full" style={{ gap: '1px' }}>
              {/* Big Eye Boy (大眼路) - top half */}
              <div className="flex-1" style={{ borderBottom: `1px solid ${LINE}` }}>
                <DerivedRoadGrid grid={bigEyeGrid} type="big_eye" rows={DERIVED_ROWS} cols={DERIVED_COLS} predictedCells={bigEyePredCells} />
              </div>
              {/* Small Road + Cockroach Road - bottom half, side by side */}
              <div className="flex-1 flex" style={{ gap: '1px' }}>
                <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
                  <DerivedRoadGrid grid={smallGrid} type="small" rows={DERIVED_ROWS} cols={DERIVED_COLS} predictedCells={smallPredCells} />
                </div>
                <div className="flex-1">
                  <DerivedRoadGrid grid={cockroachGrid} type="cockroach" rows={DERIVED_ROWS} cols={DERIVED_COLS} predictedCells={cockroachPredCells} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats bar */}
          <div className="shrink-0 flex items-center justify-between px-2" style={{
            height: 20, backgroundColor: CELL_BG,
            borderTop: `1px solid ${LINE}`,
            fontSize: '9px', fontWeight: 'bold',
          }}>
            {/* Left: stats */}
            <div className="flex items-center gap-2">
              <span style={{ color: '#DC2626' }}>莊 <span className="text-gray-800">{stats.banker}</span></span>
              <span style={{ color: '#2563EB' }}>閒 <span className="text-gray-800">{stats.player}</span></span>
              <span style={{ color: '#16A34A' }}>和 <span className="text-gray-800">{stats.tie}</span></span>
              <span className="text-gray-500">總 <span className="text-gray-800">{stats.total}</span></span>
            </div>
            {/* Right: ask road predictions */}
            {onToggleAskRoad && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleAskRoad('player')}
                  className={`flex items-center ${askRoadMode === 'player' ? 'underline' : ''}`}
                  style={{ color: '#2563EB' }}
                >
                  閒問路
                  {playerAskPrediction && <PredictionDots {...playerAskPrediction} />}
                </button>
                <button
                  onClick={() => onToggleAskRoad('banker')}
                  className={`flex items-center ${askRoadMode === 'banker' ? 'underline' : ''}`}
                  style={{ color: '#DC2626' }}
                >
                  莊問路
                  {bankerAskPrediction && <PredictionDots {...bankerAskPrediction} />}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
