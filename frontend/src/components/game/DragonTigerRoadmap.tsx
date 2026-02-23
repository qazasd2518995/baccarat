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

// DT Big Road grid type
type DTBigRoadCell = { result: 'dragon' | 'tiger'; tieCount: number } | null;
type DTBigRoadGrid = DTBigRoadCell[][];

// Build Big Road data structure for Dragon Tiger
function buildDTBigRoad(data: Array<{ result: string }>): DTBigRoadGrid {
  const ROWS = 6;
  const MAX_COLS = 60;
  const grid: DTBigRoadGrid = Array(ROWS).fill(null).map(() => Array(MAX_COLS).fill(null));

  if (data.length === 0) return grid;

  let col = 0;
  let row = 0;
  let lastResult: 'dragon' | 'tiger' | null = null;
  let tieCount = 0;

  for (const round of data) {
    const result = normalizeResult(round.result);

    if (result === 'tie') {
      tieCount++;
      continue;
    }

    if (!result) continue;

    if (lastResult === null || result !== lastResult) {
      if (lastResult !== null) {
        col++;
        row = 0;
      }
      lastResult = result;
    } else {
      row++;
      if (row >= ROWS) {
        row = ROWS - 1;
        col++;
      }
    }

    if (col < MAX_COLS && row < ROWS) {
      grid[row][col] = { result, tieCount };
      tieCount = 0;
    }
  }

  return grid;
}

// Helper: get column length
function getDTColumnLength(grid: DTBigRoadGrid, col: number): number {
  let length = 0;
  for (let row = 0; row < 6; row++) {
    if (grid[row]?.[col]) length++;
  }
  return length;
}

// Helper: find max column with data
function getDTMaxCol(grid: DTBigRoadGrid): number {
  let maxCol = 0;
  const cols = grid[0]?.length || 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 6; row++) {
      if (grid[row]?.[col]) { maxCol = col; break; }
    }
  }
  return maxCol;
}

// Calculate derived road
function calculateDTDerivedRoad(grid: DTBigRoadGrid, offset: number): ('red' | 'blue')[] {
  const results: ('red' | 'blue')[] = [];
  const maxCol = getDTMaxCol(grid);

  for (let col = offset; col <= maxCol; col++) {
    const currLen = getDTColumnLength(grid, col);
    const compareLen = getDTColumnLength(grid, col - offset);

    if (currLen > 1) {
      for (let entry = 1; entry < currLen; entry++) {
        const compareHasEntry = entry < compareLen;
        results.push(compareHasEntry ? 'red' : 'blue');
      }
    }
  }

  return results;
}

// Build derived road grid from flat array
function buildDerivedGrid(flatData: ('red' | 'blue')[], rows: number, cols: number): ('red' | 'blue' | null)[][] {
  const grid: ('red' | 'blue' | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  let dataIdx = 0;
  for (let c = 0; c < cols && dataIdx < flatData.length; c++) {
    for (let r = 0; r < rows && dataIdx < flatData.length; r++) {
      grid[r][c] = flatData[dataIdx++];
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
function BigRoad({ grid, usedCols, width }: { grid: DTBigRoadGrid; usedCols: number; width: number }) {
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

  const bigRoadGrid = useMemo(() => buildDTBigRoad(roadHistory), [roadHistory]);

  const bigEyeData = useMemo(() => calculateDTDerivedRoad(bigRoadGrid, 1), [bigRoadGrid]);
  const smallData = useMemo(() => calculateDTDerivedRoad(bigRoadGrid, 2), [bigRoadGrid]);
  const cockroachData = useMemo(() => calculateDTDerivedRoad(bigRoadGrid, 3), [bigRoadGrid]);

  const bigEyeGrid = useMemo(() => buildDerivedGrid(bigEyeData, 6, 60), [bigEyeData]);
  const smallGrid = useMemo(() => buildDerivedGrid(smallData, 6, 40), [smallData]);
  const cockroachGrid = useMemo(() => buildDerivedGrid(cockroachData, 6, 40), [cockroachData]);

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
        transform: val === 'red' ? 'rotate(45deg)' : 'rotate(-45deg)',
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
