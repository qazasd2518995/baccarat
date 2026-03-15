import { useMemo, memo, useRef, useState, useLayoutEffect } from 'react';

interface DragonTigerRoadmapProps {
  roadHistory: Array<{ result: string }>;
  askRoadMode?: 'none' | 'dragon' | 'tiger';
  onToggleAskRoad?: (mode: 'dragon' | 'tiger') => void;
}

const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB';
const LARGE_COLS = 200;

function normalizeResult(result: string | undefined): 'dragon' | 'tiger' | 'tie' | undefined {
  if (!result) return undefined;
  if (result === 'dt_tie') return 'tie';
  if (result === 'dragon' || result === 'tiger' || result === 'tie') return result;
  return undefined;
}

interface DTBigRoadCell { result: 'dragon' | 'tiger'; tieCount: number; }

function buildDTBigRoadColumns(data: Array<{ result: string }>): DTBigRoadCell[][] {
  const columns: DTBigRoadCell[][] = [];
  let currentCol: DTBigRoadCell[] = [];
  let lastResult: 'dragon' | 'tiger' | null = null;

  for (const round of data) {
    const result = normalizeResult(round.result);
    if (result === 'tie') {
      if (currentCol.length > 0) currentCol[currentCol.length - 1].tieCount++;
      else if (columns.length > 0) { const prev = columns[columns.length - 1]; prev[prev.length - 1].tieCount++; }
      continue;
    }
    if (!result) continue;
    if (lastResult === null || result !== lastResult) {
      if (currentCol.length > 0) columns.push(currentCol);
      currentCol = [{ result, tieCount: 0 }];
      lastResult = result;
    } else {
      currentCol.push({ result, tieCount: 0 });
    }
  }
  if (currentCol.length > 0) columns.push(currentCol);
  return columns;
}

function buildDTBigRoadGrid(columns: DTBigRoadCell[][], rows: number, maxCols: number): (DTBigRoadCell | null)[][] {
  const grid: (DTBigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));
  let gridCol = 0;
  for (const column of columns) {
    let row = 0, col = gridCol;
    for (const cell of column) {
      if (row >= rows) { col++; row = rows - 1; }
      while (col < maxCols && grid[row][col] !== null) col++;
      if (col < maxCols) grid[row][col] = cell;
      row++;
    }
    gridCol = col + 1;
  }
  return grid;
}

function buildDTDerivedRoad(columns: DTBigRoadCell[][], offset: number, maxRows: number, maxCols: number): ('red' | 'blue' | null)[][] {
  const grid: ('red' | 'blue' | null)[][] = Array(maxRows).fill(null).map(() => Array(maxCols).fill(null));
  const startCol = offset + 1;
  if (columns.length < startCol) return grid;

  const colorResults: ('red' | 'blue')[] = [];
  for (let colIdx = startCol - 1; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;
    for (let entryIdx = 0; entryIdx < currColLen; entryIdx++) {
      if (colIdx === startCol - 1 && entryIdx === 0) continue;
      let color: 'red' | 'blue';
      if (entryIdx === 0) {
        const prevColLen = columns[colIdx - 1].length;
        const refColIdx = colIdx - 1 - offset;
        const refColLen = refColIdx >= 0 ? columns[refColIdx].length : 0;
        color = prevColLen === refColLen ? 'red' : 'blue';
      } else {
        const compareColIdx = colIdx - offset;
        const compareColLen = compareColIdx >= 0 ? columns[compareColIdx].length : 0;
        color = compareColLen > entryIdx ? 'red' : (compareColLen === entryIdx ? 'blue' : 'red');
      }
      colorResults.push(color);
    }
  }

  // Group into columns by color, place in grid with dragon tail
  const derivedColumns: ('red' | 'blue')[][] = [];
  let currentDerivedCol: ('red' | 'blue')[] = [];
  let lastColor: 'red' | 'blue' | null = null;
  for (const color of colorResults) {
    if (lastColor !== null && color !== lastColor) {
      if (currentDerivedCol.length > 0) derivedColumns.push(currentDerivedCol);
      currentDerivedCol = [color];
    } else {
      currentDerivedCol.push(color);
    }
    lastColor = color;
  }
  if (currentDerivedCol.length > 0) derivedColumns.push(currentDerivedCol);

  let gCol = 0;
  for (const column of derivedColumns) {
    let row = 0, col = gCol;
    for (const c of column) {
      if (row >= maxRows) { col++; row = maxRows - 1; }
      while (col < maxCols && grid[row][col] !== null) col++;
      if (col < maxCols) grid[row][col] = c;
      row++;
    }
    gCol = col + 1;
  }
  return grid;
}

function calculateDTNextPrediction(columns: DTBigRoadCell[][], nextResult: 'dragon' | 'tiger'): {
  bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null;
} {
  if (columns.length === 0) return { bigEye: null, small: null, cockroach: null };
  const lastCol = columns[columns.length - 1];
  const lastResult = lastCol[0].result;
  let newColumns: DTBigRoadCell[][];
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
  return { bigEye: calcDerived(1), small: calcDerived(2), cockroach: calcDerived(3) };
}

// ── Bead Road ──
function BeadRoad({ data, rows, cols, predictedCount }: {
  data: Array<{ result: string }>; rows: number; cols: number; predictedCount: number;
}) {
  const startIdx = Math.max(0, data.length - rows * cols);
  const visibleData = data.slice(startIdx);
  const realCount = data.length - predictedCount;

  const bgColors: Record<string, string> = { dragon: '#ef4444', tiger: '#3b82f6', tie: '#22c55e' };
  const labels: Record<string, string> = { dragon: '龍', tiger: '虎', tie: '和' };

  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const dataIdx = c * rows + r;
      const entry = visibleData[dataIdx];
      const key = `b-${r}-${c}`;
      const result = entry ? normalizeResult(entry.result) : null;
      if (!result) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }
      const isPred = predictedCount > 0 && (startIdx + dataIdx) >= realCount;
      const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full flex items-center justify-center w-full aspect-square max-w-[14px]"
            style={{ backgroundColor: bgColors[result], ...blinkStyle }}>
            <span style={{ color: '#FFFFFF', fontSize: '6px', fontWeight: 'bold', lineHeight: 1 }}>{labels[result]}</span>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="grid h-full w-full" style={{
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE,
    }}>
      {cells}
    </div>
  );
}

// ── Big Road ──
function BigRoad({ grid, rows, cols, predictedCells }: {
  grid: (DTBigRoadCell | null)[][]; rows: number; cols: number; predictedCells?: Set<string>;
}) {
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cell = grid[r]?.[c] ?? null;
      const key = `br-${r}-${c}`;
      if (!cell) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }
      const borderColor = cell.result === 'dragon' ? '#ef4444' : '#3b82f6';
      const isPred = predictedCells?.has(`${r}-${c}`) ?? false;
      const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full" style={{ width: 9, height: 9, border: `1.5px solid ${borderColor}`, ...blinkStyle }}>
            {cell.tieCount > 0 && (
              <span className="flex items-center justify-center font-bold" style={{ fontSize: '5px', lineHeight: '6px', color: '#22c55e' }}>
                {cell.tieCount}
              </span>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="grid h-full w-full" style={{
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE,
    }}>
      {cells}
    </div>
  );
}

// ── Derived Road Grid (2x2 mini cells) ──
function DerivedRoadGrid({ grid, type, rows, cols, predictedCells }: {
  grid: ('red' | 'blue' | null)[][]; type: 'big_eye' | 'small' | 'cockroach'; rows: number; cols: number; predictedCells?: Set<string>;
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
          const dataRow = gr * 2 + mr, dataCol = gc * 2 + mc;
          const value = grid[dataRow]?.[dataCol] ?? null;
          const miniKey = `mini-${mr}-${mc}`;
          if (!value) { miniCells.push(<div key={miniKey} />); continue; }
          const isPred = predictedCells?.has(`${dataRow}-${dataCol}`) ?? false;
          const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
          const color = value === 'red' ? '#ef4444' : '#3b82f6';

          if (type === 'big_eye') {
            miniCells.push(<div key={miniKey} className="flex items-center justify-center"><div className="rounded-full" style={{ width: 5, height: 5, border: `1px solid ${color}`, ...blinkStyle }} /></div>);
          } else if (type === 'small') {
            miniCells.push(<div key={miniKey} className="flex items-center justify-center"><div className="rounded-full" style={{ width: 5, height: 5, backgroundColor: color, ...blinkStyle }} /></div>);
          } else {
            miniCells.push(<div key={miniKey} className="flex items-center justify-center" style={blinkStyle}><svg viewBox="0 0 10 10" style={{ width: 6, height: 6 }}><line x1="1" y1="9" x2="9" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg></div>);
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
      gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE,
    }}>
      {gridCells}
    </div>
  );
}

// ── Prediction indicator ──
function PredictionDots({ bigEye, small, cockroach }: {
  bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null;
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
function DragonTigerRoadmap({ roadHistory, askRoadMode, onToggleAskRoad }: DragonTigerRoadmapProps) {
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

  const isAskActive = askRoadMode && askRoadMode !== 'none';
  const simHistory = useMemo(() => isAskActive ? [...roadHistory, { result: askRoadMode! }] : roadHistory, [roadHistory, askRoadMode, isAskActive]);

  const isNarrow = containerWidth > 0 && containerWidth < 350;
  const BEAD_ROWS = 6;
  const BEAD_COLS = isNarrow ? 6 : 8;
  const BIG_ROAD_ROWS = 6;
  const BIG_ROAD_COLS = isNarrow ? 18 : 24;
  const DERIVED_ROWS = 6;
  const DERIVED_COLS = isNarrow ? 10 : 14;

  const realBigRoadColumns = useMemo(() => buildDTBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadColumns = useMemo(() => isAskActive ? buildDTBigRoadColumns(simHistory) : realBigRoadColumns, [simHistory, realBigRoadColumns, isAskActive]);

  const bigRoadGridLarge = useMemo(() => buildDTBigRoadGrid(bigRoadColumns, BIG_ROAD_ROWS, LARGE_COLS), [bigRoadColumns]);
  const realBigRoadGridLarge = useMemo(() => isAskActive ? buildDTBigRoadGrid(realBigRoadColumns, BIG_ROAD_ROWS, LARGE_COLS) : bigRoadGridLarge, [realBigRoadColumns, bigRoadGridLarge, isAskActive]);

  // Big road sliding window
  let maxUsedCol = 0;
  for (let c = 0; c < LARGE_COLS; c++) {
    for (let r = 0; r < BIG_ROAD_ROWS; r++) {
      if (bigRoadGridLarge[r]?.[c]) maxUsedCol = c;
    }
  }
  const bigRoadColOffset = Math.max(0, maxUsedCol - BIG_ROAD_COLS + 1);

  const bigRoadGrid = useMemo(() => {
    const grid: (DTBigRoadCell | null)[][] = Array(BIG_ROAD_ROWS).fill(null).map(() => Array(BIG_ROAD_COLS).fill(null));
    for (let r = 0; r < BIG_ROAD_ROWS; r++) {
      for (let c = 0; c < BIG_ROAD_COLS; c++) {
        grid[r][c] = bigRoadGridLarge[r]?.[c + bigRoadColOffset] ?? null;
      }
    }
    return grid;
  }, [bigRoadGridLarge, bigRoadColOffset, BIG_ROAD_COLS]);

  const bigRoadPredictedCells = useMemo(() => {
    if (!isAskActive) return undefined;
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
  }, [bigRoadGridLarge, realBigRoadGridLarge, isAskActive, bigRoadColOffset, BIG_ROAD_COLS]);

  // Derived roads
  const bigEyeGridLarge = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 1, DERIVED_ROWS, LARGE_COLS), [bigRoadColumns]);
  const smallGridLarge = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 2, DERIVED_ROWS, LARGE_COLS), [bigRoadColumns]);
  const cockroachGridLarge = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 3, DERIVED_ROWS, LARGE_COLS), [bigRoadColumns]);

  const realBigEyeGridLarge = useMemo(() => isAskActive ? buildDTDerivedRoad(realBigRoadColumns, 1, DERIVED_ROWS, LARGE_COLS) : bigEyeGridLarge, [realBigRoadColumns, bigEyeGridLarge, isAskActive]);
  const realSmallGridLarge = useMemo(() => isAskActive ? buildDTDerivedRoad(realBigRoadColumns, 2, DERIVED_ROWS, LARGE_COLS) : smallGridLarge, [realBigRoadColumns, smallGridLarge, isAskActive]);
  const realCockroachGridLarge = useMemo(() => isAskActive ? buildDTDerivedRoad(realBigRoadColumns, 3, DERIVED_ROWS, LARGE_COLS) : cockroachGridLarge, [realBigRoadColumns, cockroachGridLarge, isAskActive]);

  const extractWindow = (large: ('red' | 'blue' | null)[][], cols: number) => {
    let maxC = 0;
    for (let c = 0; c < LARGE_COLS; c++) { for (let r = 0; r < DERIVED_ROWS; r++) { if (large[r]?.[c]) maxC = c; } }
    const offset = Math.max(0, maxC - cols + 1);
    const grid: ('red' | 'blue' | null)[][] = Array(DERIVED_ROWS).fill(null).map(() => Array(cols).fill(null));
    for (let r = 0; r < DERIVED_ROWS; r++) { for (let c = 0; c < cols; c++) { grid[r][c] = large[r]?.[c + offset] ?? null; } }
    return { grid, offset };
  };

  const { grid: bigEyeGrid, offset: bigEyeOffset } = useMemo(() => extractWindow(bigEyeGridLarge, DERIVED_COLS), [bigEyeGridLarge, DERIVED_COLS]);
  const { grid: smallGrid, offset: smallOffset } = useMemo(() => extractWindow(smallGridLarge, DERIVED_COLS), [smallGridLarge, DERIVED_COLS]);
  const { grid: cockroachGrid, offset: cockroachOffset } = useMemo(() => extractWindow(cockroachGridLarge, DERIVED_COLS), [cockroachGridLarge, DERIVED_COLS]);

  const buildPredSet = (full: ('red' | 'blue' | null)[][], real: ('red' | 'blue' | null)[][], offset: number, cols: number): Set<string> | undefined => {
    if (!isAskActive) return undefined;
    const predicted = new Set<string>();
    for (let r = 0; r < DERIVED_ROWS; r++) { for (let c = 0; c < LARGE_COLS; c++) { if (full[r]?.[c] && !real[r]?.[c]) { const wc = c - offset; if (wc >= 0 && wc < cols) predicted.add(`${r}-${wc}`); } } }
    return predicted.size > 0 ? predicted : undefined;
  };

  const bigEyePredCells = useMemo(() => buildPredSet(bigEyeGridLarge, realBigEyeGridLarge, bigEyeOffset, DERIVED_COLS), [bigEyeGridLarge, realBigEyeGridLarge, bigEyeOffset, DERIVED_COLS, isAskActive]);
  const smallPredCells = useMemo(() => buildPredSet(smallGridLarge, realSmallGridLarge, smallOffset, DERIVED_COLS), [smallGridLarge, realSmallGridLarge, smallOffset, DERIVED_COLS, isAskActive]);
  const cockroachPredCells = useMemo(() => buildPredSet(cockroachGridLarge, realCockroachGridLarge, cockroachOffset, DERIVED_COLS), [cockroachGridLarge, realCockroachGridLarge, cockroachOffset, DERIVED_COLS, isAskActive]);

  // Predictions
  const nextDragon = useMemo(() => calculateDTNextPrediction(realBigRoadColumns, 'dragon'), [realBigRoadColumns]);
  const nextTiger = useMemo(() => calculateDTNextPrediction(realBigRoadColumns, 'tiger'), [realBigRoadColumns]);

  const predictedCount = isAskActive ? 1 : 0;

  // Stats
  const stats = useMemo(() => {
    let dragon = 0, tiger = 0, tie = 0;
    for (const e of roadHistory) {
      const r = normalizeResult(e.result);
      if (r === 'dragon') dragon++;
      else if (r === 'tiger') tiger++;
      else if (r === 'tie') tie++;
    }
    return { dragon, tiger, tie, total: roadHistory.length };
  }, [roadHistory]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Roads area */}
          <div className="flex-1 flex" style={{ gap: '1px' }}>
            {/* Bead Road ~15% */}
            <div className="h-full shrink-0" style={{ width: '15%', borderRight: `1px solid ${LINE}` }}>
              <BeadRoad data={simHistory} rows={BEAD_ROWS} cols={BEAD_COLS} predictedCount={predictedCount} />
            </div>

            {/* Big Road ~50% */}
            <div className="h-full" style={{ width: '50%', borderRight: `1px solid ${LINE}` }}>
              <BigRoad grid={bigRoadGrid} rows={BIG_ROAD_ROWS} cols={BIG_ROAD_COLS} predictedCells={bigRoadPredictedCells} />
            </div>

            {/* Derived Roads ~35% */}
            <div className="flex-1 flex flex-col h-full" style={{ gap: '1px' }}>
              <div className="flex-1" style={{ borderBottom: `1px solid ${LINE}` }}>
                <DerivedRoadGrid grid={bigEyeGrid} type="big_eye" rows={DERIVED_ROWS} cols={DERIVED_COLS} predictedCells={bigEyePredCells} />
              </div>
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
            <div className="flex items-center gap-2">
              <span style={{ color: '#ef4444' }}>龍 <span className="text-gray-800">{stats.dragon}</span></span>
              <span style={{ color: '#3b82f6' }}>虎 <span className="text-gray-800">{stats.tiger}</span></span>
              <span style={{ color: '#22c55e' }}>和 <span className="text-gray-800">{stats.tie}</span></span>
              <span className="text-gray-500">總 <span className="text-gray-800">{stats.total}</span></span>
            </div>
            {onToggleAskRoad && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleAskRoad('dragon')}
                  className={`flex items-center ${askRoadMode === 'dragon' ? 'underline' : ''}`}
                  style={{ color: '#ef4444' }}
                >
                  龍問路
                  <PredictionDots {...nextDragon} />
                </button>
                <button
                  onClick={() => onToggleAskRoad('tiger')}
                  className={`flex items-center ${askRoadMode === 'tiger' ? 'underline' : ''}`}
                  style={{ color: '#3b82f6' }}
                >
                  虎問路
                  <PredictionDots {...nextTiger} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(DragonTigerRoadmap);
