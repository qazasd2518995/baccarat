import { useMemo, memo, useRef, useState, useLayoutEffect } from 'react';

interface DragonTigerRoadmapProps {
  roadHistory: Array<{ result: string }>;
  askRoadMode?: 'none' | 'dragon' | 'tiger';
  onToggleAskRoad?: (mode: 'dragon' | 'tiger') => void;
}

/* White theme colors - matching Baccarat LobbyRoadmap */
const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB';

// Normalize result type
function normalizeResult(result: string | undefined): 'dragon' | 'tiger' | 'tie' | undefined {
  if (!result) return undefined;
  if (result === 'dt_tie') return 'tie';
  if (result === 'dragon' || result === 'tiger' || result === 'tie') return result;
  return undefined;
}

// DT Big Road cell type
interface DTBigRoadCell {
  result: 'dragon' | 'tiger';
  tieCount: number;
}

// Build Big Road columns for Dragon Tiger (same logic as Baccarat)
function buildDTBigRoadColumns(data: Array<{ result: string }>): DTBigRoadCell[][] {
  const columns: DTBigRoadCell[][] = [];
  let currentCol: DTBigRoadCell[] = [];
  let lastResult: 'dragon' | 'tiger' | null = null;

  for (const round of data) {
    const result = normalizeResult(round.result);

    if (result === 'tie') {
      if (currentCol.length > 0) {
        currentCol[currentCol.length - 1].tieCount++;
      } else if (columns.length > 0) {
        const prevCol = columns[columns.length - 1];
        prevCol[prevCol.length - 1].tieCount++;
      }
      continue;
    }

    if (!result) continue;

    if (lastResult === null || result !== lastResult) {
      if (currentCol.length > 0) {
        columns.push(currentCol);
      }
      currentCol = [{ result, tieCount: 0 }];
      lastResult = result;
    } else {
      currentCol.push({ result, tieCount: 0 });
    }
  }

  if (currentCol.length > 0) {
    columns.push(currentCol);
  }

  return columns;
}

// Build Big Road grid with Dragon Tail
function buildDTBigRoadGrid(columns: DTBigRoadCell[][], rows: number, maxCols: number): (DTBigRoadCell | null)[][] {
  const grid: (DTBigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));

  let gridCol = 0;

  for (const column of columns) {
    let row = 0;
    let col = gridCol;

    for (const cell of column) {
      if (row >= rows) {
        col++;
        row = rows - 1;
      }

      while (col < maxCols && grid[row][col] !== null) {
        col++;
      }

      if (col < maxCols) {
        grid[row][col] = cell;
      }
      row++;
    }

    gridCol = col + 1;
  }

  return grid;
}

// Build derived road for Dragon Tiger
function buildDTDerivedRoad(
  columns: DTBigRoadCell[][],
  offset: number,
  maxRows: number = 6,
  maxCols: number = 20
): ('red' | 'blue' | null)[][] {
  const grid: ('red' | 'blue' | null)[][] = Array(maxRows).fill(null).map(() => Array(maxCols).fill(null));

  const startCol = offset + 1;
  if (columns.length < startCol) return grid;

  let outputCol = 0;
  let outputRow = 0;
  let lastColor: 'red' | 'blue' | null = null;

  for (let colIdx = startCol - 1; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;

    for (let entryIdx = 0; entryIdx < currColLen; entryIdx++) {
      if (colIdx === startCol - 1 && entryIdx === 0) {
        continue;
      }

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

      if (lastColor !== null && color !== lastColor) {
        outputCol++;
        outputRow = 0;
      } else if (lastColor !== null) {
        outputRow++;
        if (outputRow >= maxRows) {
          outputRow = maxRows - 1;
          outputCol++;
        }
      }

      if (outputCol < maxCols && outputRow < maxRows) {
        grid[outputRow][outputCol] = color;
        lastColor = color;
      }
    }
  }

  return grid;
}

// Calculate prediction for next result
function calculateDTNextPrediction(
  columns: DTBigRoadCell[][],
  nextResult: 'dragon' | 'tiger'
): { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null } {
  if (columns.length === 0) {
    return { bigEye: null, small: null, cockroach: null };
  }

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

  return {
    bigEye: calcDerived(1),
    small: calcDerived(2),
    cockroach: calcDerived(3),
  };
}

// Statistics Panel for Dragon Tiger
function DTStatsPanel({ data, nextDragon, nextTiger, askRoadMode, onToggleAskRoad }: {
  data: Array<{ result: string }>;
  nextDragon: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  nextTiger: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  askRoadMode?: 'none' | 'dragon' | 'tiger';
  onToggleAskRoad?: (mode: 'dragon' | 'tiger') => void;
}) {
  const stats = useMemo(() => {
    let dragon = 0, tiger = 0, tie = 0;
    for (const entry of data) {
      const result = normalizeResult(entry.result);
      if (result === 'dragon') dragon++;
      else if (result === 'tiger') tiger++;
      else if (result === 'tie') tie++;
    }
    return { dragon, tiger, tie, total: data.length };
  }, [data]);

  const renderPrediction = (bigEye: 'red' | 'blue' | null, small: 'red' | 'blue' | null, cockroach: 'red' | 'blue' | null) => (
    <div className="flex items-center gap-0.5">
      <div
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          border: `1.5px solid ${bigEye === 'red' ? '#ef4444' : bigEye === 'blue' ? '#3b82f6' : '#ccc'}`,
        }}
      />
      <div
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: small === 'red' ? '#ef4444' : small === 'blue' ? '#3b82f6' : '#ccc',
        }}
      />
      <div
        style={{
          width: 6,
          height: 1.5,
          backgroundColor: cockroach === 'red' ? '#ef4444' : cockroach === 'blue' ? '#3b82f6' : '#ccc',
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
      {/* Dragon */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#DC2626' }}>龍</span>
        <span className="text-gray-800 font-medium">{stats.dragon}</span>
      </div>
      {/* Tiger */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#2563EB' }}>虎</span>
        <span className="text-gray-800 font-medium">{stats.tiger}</span>
      </div>
      {/* Tie */}
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: '#16A34A' }}>和</span>
        <span className="text-gray-800 font-medium">{stats.tie}</span>
      </div>
      {/* Total */}
      <div className="flex items-center justify-between gap-1 border-t border-gray-300 pt-0.5 mt-0.5">
        <span className="text-gray-500">總數</span>
        <span className="text-gray-800 font-medium">{stats.total}</span>
      </div>
      {/* Prediction - Next Dragon */}
      <div className="flex items-center justify-between gap-1 border-t border-gray-300 pt-0.5 mt-0.5">
        <button
          onClick={() => onToggleAskRoad?.('dragon')}
          style={{ color: '#DC2626' }}
          className={askRoadMode === 'dragon' ? 'underline font-bold' : ''}
        >龍問路</button>
        {renderPrediction(nextDragon.bigEye, nextDragon.small, nextDragon.cockroach)}
      </div>
      {/* Prediction - Next Tiger */}
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => onToggleAskRoad?.('tiger')}
          style={{ color: '#2563EB' }}
          className={askRoadMode === 'tiger' ? 'underline font-bold' : ''}
        >虎問路</button>
        {renderPrediction(nextTiger.bigEye, nextTiger.small, nextTiger.cockroach)}
      </div>
    </div>
  );
}

// Bead Road — solid circles with 龍/虎/和 labels
function BeadRoad({ data, width, predictedCount = 0 }: { data: Array<{ result: string }>; width: number; predictedCount?: number }) {
  const ROWS = 6;
  const CELL = 15;
  const cols = Math.max(Math.floor(width / (CELL + 1)), 1);
  const startIdx = Math.max(0, data.length - ROWS * cols);
  const visibleData = data.slice(startIdx);

  const bgColors: Record<string, string> = {
    dragon: '#ef4444',
    tiger: '#3b82f6',
    tie: '#22c55e',
  };
  const labels: Record<string, string> = {
    dragon: '龍',
    tiger: '虎',
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
        const result = entry ? normalizeResult(entry.result) : null;
        if (!result) return <div key={key} style={{ background: CELL_BG }} />;
        const isPred = predictedCount > 0 && (startIdx + dataIdx) >= (data.length - predictedCount);
        const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
        return (
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full flex items-center justify-center text-white font-bold"
              style={{
                width: 13,
                height: 13,
                backgroundColor: bgColors[result],
                fontSize: '7px',
                lineHeight: 1,
                ...blinkStyle,
              }}
            >
              {labels[result]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Big Road — outlined circles
function BigRoad({ grid, usedCols, width, predictedCells }: { grid: (DTBigRoadCell | null)[][]; usedCols: number; width: number; predictedCells?: Set<string> }) {
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
      const color = cell.result === 'dragon' ? '#ef4444' : '#3b82f6';
      const isPred = predictedCells?.has(`${r}-${c + colOffset}`) ?? false;
      const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 10, height: 10, border: `1.5px solid ${color}`, ...blinkStyle }}
          >
            {cell.tieCount > 0 && (
              <span style={{ fontSize: '5px', color: '#22c55e', fontWeight: 'bold', lineHeight: 1 }}>
                {cell.tieCount}
              </span>
            )}
          </div>
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

// Generic derived road component
function DerivedRoad({
  grid,
  cellSize,
  renderCell,
  keyPrefix,
  width,
  predictedCount = 0,
}: {
  grid: ('red' | 'blue' | null)[][];
  cellSize: number;
  renderCell: (val: 'red' | 'blue') => React.ReactNode;
  keyPrefix: string;
  width: number;
  predictedCount?: number;
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

  // Build a set of predicted cell positions by counting from the end (column-major)
  const predictedSet = new Set<string>();
  if (predictedCount > 0) {
    // Collect all non-null cells in column-major order
    const allCells: string[] = [];
    for (let c = 0; c < (grid[0]?.length ?? 0); c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[r]?.[c]) allCells.push(`${r}-${c}`);
      }
    }
    // The last N are predicted
    for (let i = Math.max(0, allCells.length - predictedCount); i < allCells.length; i++) {
      predictedSet.add(allCells[i]);
    }
  }

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < visibleCols; c++) {
      const val = grid[r]?.[c + colOffset];
      const key = `${keyPrefix}-${r}-${c}`;
      if (!val) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
      } else {
        const isPred = predictedSet.has(`${r}-${c + colOffset}`);
        const blinkStyle = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG, ...blinkStyle }}>
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

  // Simulated data when ask road is active
  const isAskActive = askRoadMode && askRoadMode !== 'none';
  const simHistory = useMemo(() => {
    if (!isAskActive) return roadHistory;
    return [...roadHistory, { result: askRoadMode! }];
  }, [roadHistory, askRoadMode, isAskActive]);

  // Real data (without prediction)
  const realBigRoadColumns = useMemo(() => buildDTBigRoadColumns(roadHistory), [roadHistory]);
  // Simulated or real data
  const bigRoadColumns = useMemo(() => isAskActive ? buildDTBigRoadColumns(simHistory) : realBigRoadColumns, [simHistory, realBigRoadColumns, isAskActive]);
  const bigRoadGrid = useMemo(() => buildDTBigRoadGrid(bigRoadColumns, 6, 60), [bigRoadColumns]);
  const realBigRoadGrid = useMemo(() => isAskActive ? buildDTBigRoadGrid(realBigRoadColumns, 6, 60) : bigRoadGrid, [realBigRoadColumns, bigRoadGrid, isAskActive]);

  const bigEyeGrid = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 1, 6, 60), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 2, 6, 40), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 3, 6, 40), [bigRoadColumns]);

  const realBigEyeGrid = useMemo(() => isAskActive ? buildDTDerivedRoad(realBigRoadColumns, 1, 6, 60) : bigEyeGrid, [realBigRoadColumns, bigEyeGrid, isAskActive]);
  const realSmallGrid = useMemo(() => isAskActive ? buildDTDerivedRoad(realBigRoadColumns, 2, 6, 40) : smallGrid, [realBigRoadColumns, smallGrid, isAskActive]);
  const realCockroachGrid = useMemo(() => isAskActive ? buildDTDerivedRoad(realBigRoadColumns, 3, 6, 40) : cockroachGrid, [realBigRoadColumns, cockroachGrid, isAskActive]);

  // Calculate predictions
  const nextDragon = useMemo(() => calculateDTNextPrediction(realBigRoadColumns, 'dragon'), [realBigRoadColumns]);
  const nextTiger = useMemo(() => calculateDTNextPrediction(realBigRoadColumns, 'tiger'), [realBigRoadColumns]);

  // Count predicted cells
  const predictedCount = isAskActive ? 1 : 0;

  // Big road predicted cells
  const bigRoadPredictedCells = useMemo(() => {
    if (!isAskActive) return undefined;
    const predicted = new Set<string>();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 60; c++) {
        if (bigRoadGrid[r]?.[c] && !realBigRoadGrid[r]?.[c]) {
          predicted.add(`${r}-${c}`);
        }
      }
    }
    return predicted.size > 0 ? predicted : undefined;
  }, [bigRoadGrid, realBigRoadGrid, isAskActive]);

  // Derived road predicted counts
  const countNonNull = (grid: ('red' | 'blue' | null)[][]) => {
    let n = 0;
    for (const row of grid) for (const cell of row) if (cell != null) n++;
    return n;
  };
  const bigEyePredCount = isAskActive ? countNonNull(bigEyeGrid) - countNonNull(realBigEyeGrid) : 0;
  const smallPredCount = isAskActive ? countNonNull(smallGrid) - countNonNull(realSmallGrid) : 0;
  const cockroachPredCount = isAskActive ? countNonNull(cockroachGrid) - countNonNull(realCockroachGrid) : 0;

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
            <BeadRoad data={simHistory} width={beadWidth} predictedCount={predictedCount} />
          </div>

          {/* 1px vertical divider */}
          <div style={{ width: 1, backgroundColor: LINE }} />

          {/* Middle: Big Road + Derived Roads (same layout as Baccarat) */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: 1, backgroundColor: LINE }}>
            {/* Top: Big Road - 60% height */}
            <div style={{ height: '60%' }} className="overflow-hidden">
              <BigRoad grid={bigRoadGrid} usedCols={bigRoadUsedCols} width={roadWidth} predictedCells={bigRoadPredictedCells} />
            </div>

            {/* Bottom: Three Derived Roads - side by side */}
            <div className="flex-1 flex overflow-hidden" style={{ gap: 1 }}>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={bigEyeGrid} cellSize={7} renderCell={renderBigEye} keyPrefix="be" width={Math.floor(roadWidth / 3)} predictedCount={bigEyePredCount} />
              </div>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={smallGrid} cellSize={7} renderCell={renderSmall} keyPrefix="sr" width={Math.floor(roadWidth / 3)} predictedCount={smallPredCount} />
              </div>
              <div className="flex-1 overflow-hidden">
                <DerivedRoad grid={cockroachGrid} cellSize={7} renderCell={renderCockroach} keyPrefix="cr" width={Math.floor(roadWidth / 3)} predictedCount={cockroachPredCount} />
              </div>
            </div>
          </div>

          {/* 1px vertical divider */}
          <div style={{ width: 1, backgroundColor: LINE }} />

          {/* Right: Stats Panel */}
          <div className="shrink-0 overflow-hidden" style={{ width: statsWidth }}>
            <DTStatsPanel data={roadHistory} nextDragon={nextDragon} nextTiger={nextTiger} askRoadMode={askRoadMode} onToggleAskRoad={onToggleAskRoad} />
          </div>
        </>
      )}
    </div>
  );
}

export default memo(DragonTigerRoadmap);
