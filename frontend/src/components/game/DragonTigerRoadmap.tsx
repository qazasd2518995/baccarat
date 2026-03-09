import { useMemo, memo, useRef, useState, useLayoutEffect } from 'react';

interface DragonTigerRoadmapProps {
  roadHistory: Array<{ result: string }>;
}

/* Dark theme colors - matching LobbyRoadmap */
const CELL_BG = '#1e2433';
const LINE = '#2a3040';

const GLOW_COLORS: Record<string, string> = {
  dragon: 'rgba(239,68,68,0.4)',
  tiger: 'rgba(59,130,246,0.4)',
  tie: 'rgba(34,197,94,0.4)',
};

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
      // Tie adds to the last cell's tie count
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
      // New column
      if (currentCol.length > 0) {
        columns.push(currentCol);
      }
      currentCol = [{ result, tieCount: 0 }];
      lastResult = result;
    } else {
      // Continue in same column
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
        // New column - compare lengths
        const prevColLen = columns[colIdx - 1].length;
        const refColIdx = colIdx - 1 - offset;
        const refColLen = refColIdx >= 0 ? columns[refColIdx].length : 0;
        color = prevColLen === refColLen ? 'red' : 'blue';
      } else {
        // Continuing column - check "齊整" vs "不齊"
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

// Bead Road — solid glowing circles with 龍/虎/和 labels
function BeadRoad({ data, width }: { data: Array<{ result: string }>; width: number }) {
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
                boxShadow: `0 0 4px ${GLOW_COLORS[result]}`,
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

// Big Road — outlined glowing circles
function BigRoad({ grid, usedCols, width }: { grid: (DTBigRoadCell | null)[][]; usedCols: number; width: number }) {
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
      const glow = cell.result === 'dragon' ? GLOW_COLORS.dragon : GLOW_COLORS.tiger;
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
function DragonTigerRoadmap({ roadHistory }: DragonTigerRoadmapProps) {
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

  // Build columns first (same approach as Baccarat)
  const bigRoadColumns = useMemo(() => buildDTBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildDTBigRoadGrid(bigRoadColumns, 6, 60), [bigRoadColumns]);

  // Build derived roads using column structure
  const bigEyeGrid = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 1, 6, 60), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 2, 6, 40), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDTDerivedRoad(bigRoadColumns, 3, 6, 40), [bigRoadColumns]);

  let bigRoadUsedCols = 0;
  for (let c = 0; c < 60; c++) {
    for (let r = 0; r < 6; r++) {
      if (bigRoadGrid[r][c]) bigRoadUsedCols = c + 1;
    }
  }

  // Bead road ~34%, right roads ~66%
  const beadWidth = Math.floor(containerWidth * 0.34);
  const roadWidth = containerWidth - beadWidth - 1;
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
        width: 5,
        height: 1.5,
        backgroundColor: color,
        transform: 'rotate(45deg)',
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

          {/* Right: Stacked roads */}
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
        </>
      )}
    </div>
  );
}

export default memo(DragonTigerRoadmap);
