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
}

/* Colors */
const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB';

// Bead Road (珠盤路) - 6 rows x 12 cols, colored circles with 庄/闲/和 text
function BeadRoad({ grid, rows, cols }: { grid: (RoadHistoryEntry | null)[][]; rows: number; cols: number }) {
  const cells: React.ReactNode[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const entry = grid[r]?.[c] ?? null;
      const key = `bead-${r}-${c}`;

      if (!entry) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }

      let bgColor = '#FFFFFF';
      let text = '';

      if (entry.result === 'banker') {
        bgColor = '#DC2626';
        text = '庄';
      } else if (entry.result === 'player') {
        bgColor = '#2563EB';
        text = '闲';
      } else if (entry.result === 'tie') {
        bgColor = '#16A34A';
        text = '和';
      }

      cells.push(
        <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 12,
              height: 12,
              backgroundColor: bgColor,
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: '7px', fontWeight: 'bold' }}>{text}</span>
          </div>
        </div>
      );
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

// Big Road (大路) - hollow circles with grid lines
function BigRoad({ grid, rows, cols }: { grid: (BigRoadCell | null)[][]; rows: number; cols: number }) {
  const cells: React.ReactNode[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cell = grid[r]?.[c] ?? null;
      const key = `br-${r}-${c}`;

      if (!cell) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }

      const borderColor = cell.result === 'banker' ? '#DC2626' : '#2563EB';

      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div
            className="rounded-full"
            style={{
              width: 9,
              height: 9,
              border: `1.5px solid ${borderColor}`,
            }}
          />
          {cell.tieCount > 0 && (
            <div
              className="absolute"
              style={{
                width: 8,
                height: '1px',
                backgroundColor: '#16A34A',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
              }}
            />
          )}
        </div>
      );
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

// Derived Road Grid - 2x2 mini circles per grid cell, with grid lines between 2x2 units
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
  // Each grid cell contains 2x2 mini circles
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

          if (!value) {
            miniCells.push(<div key={miniKey} />);
            continue;
          }

          const color = value === 'red' ? '#DC2626' : '#2563EB';

          if (type === 'big_eye') {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <div
                  className="rounded-full"
                  style={{ width: 5, height: 5, border: `1px solid ${color}` }}
                />
              </div>
            );
          } else if (type === 'small') {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <div
                  className="rounded-full"
                  style={{ width: 5, height: 5, backgroundColor: color }}
                />
              </div>
            );
          } else {
            miniCells.push(
              <div key={miniKey} className="flex items-center justify-center">
                <svg viewBox="0 0 10 10" style={{ width: 6, height: 6 }}>
                  <line x1="1" y1="9" x2="9" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            );
          }
        }
      }

      gridCells.push(
        <div
          key={key}
          className="grid"
          style={{
            gridTemplateRows: 'repeat(2, 1fr)',
            gridTemplateColumns: 'repeat(2, 1fr)',
            background: CELL_BG,
          }}
        >
          {miniCells}
        </div>
      );
    }
  }

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridAutoFlow: 'column',
        gap: '1px',
        backgroundColor: LINE,
      }}
    >
      {gridCells}
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

  // Grid dimensions — reduce columns on small screens
  const isMobile = containerWidth > 0 && containerWidth < 300;
  const BEAD_ROWS = 6;
  const BEAD_COLS = isMobile ? 8 : 12;
  const BIG_ROAD_ROWS = 6;
  const BIG_ROAD_COLS = isMobile ? 12 : 18;
  // Derived roads: 6 rows x N cols of mini circles = Nx6 grid cells (each 2x2)
  const DERIVED_ROWS = 6;
  const DERIVED_COLS = isMobile ? 8 : 12;

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, BIG_ROAD_ROWS, BIG_ROAD_COLS), [bigRoadColumns]);
  const beadRoadGrid = useMemo(() => buildBeadRoadGrid(roadHistory, BEAD_ROWS), [roadHistory]);

  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Left: Bead Road (珠盤路) */}
          <div className="h-full" style={{ width: isMobile ? '24%' : '28%', borderRight: `1px solid ${LINE}` }}>
            <BeadRoad grid={beadRoadGrid} rows={BEAD_ROWS} cols={BEAD_COLS} />
          </div>

          {/* Right: Big Road + Derived Roads */}
          <div className="flex-1 flex flex-col h-full">
            {/* Top: Big Road (大路) - 6x18, takes 60% height */}
            <div style={{ height: '60%', borderBottom: `1px solid ${LINE}` }}>
              <BigRoad grid={bigRoadGrid} rows={BIG_ROAD_ROWS} cols={BIG_ROAD_COLS} />
            </div>

            {/* Bottom: Three Derived Roads - each 3x6 grid cells (6x12 mini circles) */}
            <div className="flex-1 flex">
              <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
                <DerivedRoadGrid grid={bigEyeGrid} type="big_eye" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
              </div>
              <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
                <DerivedRoadGrid grid={smallGrid} type="small" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
              </div>
              <div className="flex-1">
                <DerivedRoadGrid grid={cockroachGrid} type="cockroach" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
