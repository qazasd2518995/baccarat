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
  showBeadRoad?: boolean;
}

/* Light theme colors for lobby cards */
const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB'; // gray-300 for visible grid lines

// Bead Road (珠盤路) - Shows 庄/闲/和 text in colored cells
function BeadRoad({ grid, rows, cols }: { grid: (RoadHistoryEntry | null)[][]; rows: number; cols: number }) {
  const cells: React.ReactNode[] = [];

  // Render column by column (grid auto flow is column)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const entry = grid[r]?.[c] ?? null;
      const key = `bead-${r}-${c}`;

      if (!entry) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }

      let bgColor = CELL_BG;
      let textColor = '#000';
      let text = '';

      if (entry.result === 'banker') {
        bgColor = '#DC2626'; // red
        textColor = '#FFFFFF';
        text = '庄';
      } else if (entry.result === 'player') {
        bgColor = '#2563EB'; // blue
        textColor = '#FFFFFF';
        text = '闲';
      } else if (entry.result === 'tie') {
        bgColor = '#16A34A'; // green
        textColor = '#FFFFFF';
        text = '和';
      }

      cells.push(
        <div
          key={key}
          className="flex items-center justify-center"
          style={{ background: bgColor }}
        >
          <span style={{ color: textColor, fontSize: '9px', fontWeight: 'bold' }}>{text}</span>
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

// Big Road Component - hollow circles
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
              width: 8,
              height: 8,
              border: `1.5px solid ${borderColor}`,
            }}
          />
          {cell.tieCount > 0 && (
            <div
              className="absolute"
              style={{
                width: '100%',
                height: '1px',
                backgroundColor: '#16A34A',
                top: '50%',
                transform: 'rotate(-45deg)',
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

// Derived Road Grid - with grid lines
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
  const cells: React.ReactNode[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const value = grid[r]?.[c] ?? null;
      const key = `dr-${r}-${c}`;

      if (!value) {
        cells.push(<div key={key} style={{ background: CELL_BG }} />);
        continue;
      }

      const color = value === 'red' ? '#DC2626' : '#2563EB';

      if (type === 'big_eye') {
        // Hollow circle
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full"
              style={{ width: 5, height: 5, border: `1px solid ${color}` }}
            />
          </div>
        );
      } else if (type === 'small') {
        // Filled circle
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full"
              style={{ width: 5, height: 5, backgroundColor: color }}
            />
          </div>
        );
      } else {
        // Cockroach: diagonal slash
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
            <svg viewBox="0 0 10 10" style={{ width: 6, height: 6 }}>
              <line x1="1" y1="9" x2="9" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
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
function LobbyRoadmap({ roadHistory, showBeadRoad = true }: LobbyRoadmapProps) {
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

  // Grid dimensions
  const BEAD_ROWS = 6;
  const BEAD_COLS = 10;
  const BIG_ROAD_ROWS = 6;
  const BIG_ROAD_COLS = 28;
  const DERIVED_ROWS = 6;
  const DERIVED_COLS = 14;

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, BIG_ROAD_ROWS, BIG_ROAD_COLS), [bigRoadColumns]);
  const beadRoadGrid = useMemo(() => buildBeadRoadGrid(roadHistory, BEAD_ROWS), [roadHistory]);

  // Build derived roads
  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, DERIVED_ROWS, DERIVED_COLS), [bigRoadColumns]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Left: Bead Road (珠盤路) */}
          {showBeadRoad && (
            <div className="h-full" style={{ width: '22%', borderRight: `1px solid ${LINE}` }}>
              <BeadRoad grid={beadRoadGrid} rows={BEAD_ROWS} cols={BEAD_COLS} />
            </div>
          )}

          {/* Right: Big Road + Derived Roads */}
          <div className="flex-1 flex flex-col h-full">
            {/* Top: Big Road (大路) - 60% height */}
            <div style={{ height: '60%', borderBottom: `1px solid ${LINE}` }}>
              <BigRoad grid={bigRoadGrid} rows={BIG_ROAD_ROWS} cols={BIG_ROAD_COLS} />
            </div>

            {/* Bottom: Three Derived Roads - 40% height */}
            <div className="flex-1 flex">
              {/* Big Eye Boy */}
              <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
                <DerivedRoadGrid grid={bigEyeGrid} type="big_eye" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
              </div>
              {/* Small Road */}
              <div className="flex-1" style={{ borderRight: `1px solid ${LINE}` }}>
                <DerivedRoadGrid grid={smallGrid} type="small" rows={DERIVED_ROWS} cols={DERIVED_COLS} />
              </div>
              {/* Cockroach Pig */}
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
