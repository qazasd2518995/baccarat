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
const CELL_BG = '#FFFFFF';
const LINE = '#E5E7EB';

// Big Road Component - fills circles with color
function BigRoad({ grid, usedCols, width }: { grid: (BigRoadCell | null)[][]; usedCols: number; width: number }) {
  const ROWS = 6;
  const CELL = 14;
  const maxCols = Math.max(Math.floor(width / (CELL + 1)), 1);
  const displayCols = Math.max(usedCols, maxCols);
  const colOffset = Math.max(0, displayCols - maxCols);
  const visibleCols = Math.min(displayCols, maxCols);

  const cells: React.ReactNode[] = [];
  for (let c = 0; c < visibleCols; c++) {
    for (let r = 0; r < ROWS; r++) {
      const cell = grid[r]?.[c + colOffset];
      const key = `br-${r}-${c}`;
      if (!cell) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }
      const color = cell.result === 'banker' ? '#DC2626' : '#2563EB';
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 11, height: 11, backgroundColor: color }}
          >
            {cell.tieCount > 0 && (
              <span style={{ fontSize: '7px', color: '#FFFFFF', fontWeight: 'bold', lineHeight: 1 }}>
                {cell.tieCount}
              </span>
            )}
          </div>
          {cell.bankerPair && (
            <div className="absolute" style={{ top: 1, left: 1, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#DC2626' }} />
          )}
          {cell.playerPair && (
            <div className="absolute" style={{ bottom: 1, right: 1, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#2563EB' }} />
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
        gridAutoFlow: 'column',
        gap: '1px',
        backgroundColor: LINE,
      }}
    >
      {cells}
    </div>
  );
}

// Compact Derived Road Grid - 2x2 mini-cells per grid cell (same as game page)
function CompactDerivedRoadGrid({ data, type }: { data: ('red' | 'blue')[]; type: 'big_eye' | 'small' | 'cockroach' }) {
  // Display: 6 rows x 16 cols of small circles
  const SMALL_ROWS = 6;
  const SMALL_COLS = 16;
  const TOTAL_CELLS = SMALL_ROWS * SMALL_COLS;

  // Fill array column by column (top to bottom, then next column)
  const grid: (('red' | 'blue') | null)[] = Array(TOTAL_CELLS).fill(null);
  for (let i = 0; i < Math.min(data.length, TOTAL_CELLS); i++) {
    const col = Math.floor(i / SMALL_ROWS);
    const row = i % SMALL_ROWS;
    const idx = row * SMALL_COLS + col;
    if (idx < TOTAL_CELLS) {
      grid[idx] = data[i];
    }
  }

  const colors = {
    red: { border: '#DC2626', fill: '#DC2626' },
    blue: { border: '#2563EB', fill: '#2563EB' },
  };

  const renderMiniCell = (value: ('red' | 'blue') | null, key: string) => {
    if (!value) {
      return <div key={key} className="w-full h-full" />;
    }
    const color = colors[value];

    if (type === 'big_eye') {
      return (
        <div key={key} className="w-full h-full flex items-center justify-center">
          <div
            className="w-[5px] h-[5px] rounded-full"
            style={{ border: `1px solid ${color.border}` }}
          />
        </div>
      );
    }

    if (type === 'small') {
      return (
        <div key={key} className="w-full h-full flex items-center justify-center">
          <div
            className="w-[5px] h-[5px] rounded-full"
            style={{ backgroundColor: color.fill }}
          />
        </div>
      );
    }

    // Cockroach: diagonal slash
    return (
      <div key={key} className="w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 10 10" className="w-[6px] h-[6px]">
          <line x1="1" y1="9" x2="9" y2="1" stroke={color.fill} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  };

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateColumns: `repeat(${SMALL_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${SMALL_ROWS}, 1fr)`,
        backgroundColor: CELL_BG,
      }}
    >
      {grid.map((value, idx) => renderMiniCell(value, `cell-${idx}`))}
    </div>
  );
}

// Convert grid-based derived road to flat array for compact display
function flattenDerivedRoad(grid: ('red' | 'blue' | null)[][], rows: number): ('red' | 'blue')[] {
  const result: ('red' | 'blue')[] = [];
  const cols = grid[0]?.length ?? 0;

  // Read column by column
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const val = grid[r]?.[c];
      if (val) result.push(val);
    }
  }

  return result;
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
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, 6, 60), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, 6, 60), [bigRoadColumns]);

  // Convert grids to flat arrays for compact display
  const bigEyeData = useMemo(() => flattenDerivedRoad(bigEyeGrid, 6), [bigEyeGrid]);
  const smallData = useMemo(() => flattenDerivedRoad(smallGrid, 6), [smallGrid]);
  const cockroachData = useMemo(() => flattenDerivedRoad(cockroachGrid, 6), [cockroachGrid]);

  let bigRoadUsedCols = 0;
  for (let c = 0; c < 60; c++) {
    for (let r = 0; r < 6; r++) {
      if (bigRoadGrid[r][c]) bigRoadUsedCols = c + 1;
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Big Road - top section */}
          <div className="flex-[5]" style={{ borderBottom: `1px solid ${LINE}` }}>
            <BigRoad grid={bigRoadGrid} usedCols={bigRoadUsedCols} width={containerWidth} />
          </div>

          {/* Derived Roads - bottom section (2x2 compact layout) */}
          <div className="flex-[3] flex" style={{ gap: 1 }}>
            {/* Big Eye Boy - hollow circles */}
            <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
              <CompactDerivedRoadGrid data={bigEyeData} type="big_eye" />
            </div>

            {/* Small Road - filled circles */}
            <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
              <CompactDerivedRoadGrid data={smallData} type="small" />
            </div>

            {/* Cockroach Pig - slashes */}
            <div className="flex-1">
              <CompactDerivedRoadGrid data={cockroachData} type="cockroach" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
