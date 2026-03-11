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

/* Light theme colors for lobby cards */
const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB'; // gray-300 for visible grid lines

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

// Derived Road Grid - uses Big Road style layout (same color down, different color new column)
// With grid lines visible
function DerivedRoadGrid({
  grid,
  type,
  rows,
  cols
}: {
  grid: ('red' | 'blue' | null)[][];
  type: 'big_eye' | 'small' | 'cockroach';
  rows: number;
  cols: number;
}) {
  const colors = {
    red: { border: '#DC2626', fill: '#DC2626' },
    blue: { border: '#2563EB', fill: '#2563EB' },
  };

  const cells: React.ReactNode[] = [];

  // Render column by column (grid auto flow is column)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const value = grid[r]?.[c] ?? null;
      const key = `dr-${r}-${c}`;

      if (!value) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }

      const color = colors[value];

      if (type === 'big_eye') {
        // Hollow circle
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="w-[5px] h-[5px] rounded-full"
              style={{ border: `1px solid ${color.border}` }}
            />
          </div>
        );
      } else if (type === 'small') {
        // Filled circle
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: color.fill }}
            />
          </div>
        );
      } else {
        // Cockroach: diagonal slash
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            <svg viewBox="0 0 10 10" className="w-[6px] h-[6px]">
              <line x1="1" y1="9" x2="9" y2="1" stroke={color.fill} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        );
      }
    }
  }

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoFlow: 'column',
        gap: '1px',
        backgroundColor: LINE,
      }}
    >
      {cells}
    </div>
  );
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

  const DERIVED_ROWS = 6;
  const DERIVED_COLS = 16;

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, 6, 60), [bigRoadColumns]);

  // Build derived roads using the proper Big Road style layout from roadmap utils
  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);

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

          {/* Derived Roads - bottom section with grid lines */}
          <div className="flex-[3] flex" style={{ gap: 1 }}>
            {/* Big Eye Boy - hollow circles */}
            <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
              <DerivedRoadGrid grid={bigEyeGrid} type="big_eye" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
            </div>

            {/* Small Road - filled circles */}
            <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
              <DerivedRoadGrid grid={smallGrid} type="small" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
            </div>

            {/* Cockroach Pig - slashes */}
            <div className="flex-1">
              <DerivedRoadGrid grid={cockroachGrid} type="cockroach" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
