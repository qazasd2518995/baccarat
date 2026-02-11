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

/* ── Grid-fill helper ──
   Each road grid fills its container width by computing max columns */

const GRID_BG = '#d4d4d4';

// Bead Road — colored circles with Chinese labels
function BeadRoad({ data, width }: { data: RoadHistoryEntry[]; width: number }) {
  const ROWS = 6;
  const CELL = 15;
  const GAP = 1;
  const cols = Math.max(Math.floor((width + GAP) / (CELL + GAP)), 1);
  const startIdx = Math.max(0, data.length - ROWS * cols);
  const visibleData = data.slice(startIdx);

  const bgColors: Record<string, string> = {
    banker: '#DC2626',
    player: '#2563EB',
    tie: '#16A34A',
  };
  const labels: Record<string, string> = {
    banker: '莊',
    player: '閒',
    tie: '和',
  };

  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
        gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
        gap: `${GAP}px`,
        backgroundColor: GRID_BG,
      }}
    >
      {Array.from({ length: ROWS * cols }, (_, i) => {
        const row = i % ROWS;
        const col = Math.floor(i / ROWS);
        // Grid fills row-first, but bead road is column-first
        const dataIdx = col * ROWS + row;
        const entry = visibleData[dataIdx];
        const key = `b-${row}-${col}`;
        if (!entry) return <div key={key} style={{ background: '#fff' }} />;
        return (
          <div key={key} className="relative flex items-center justify-center" style={{ background: '#fff' }}>
            <div
              className="rounded-full flex items-center justify-center text-white font-bold"
              style={{
                width: CELL - 2,
                height: CELL - 2,
                backgroundColor: bgColors[entry.result],
                fontSize: '7px',
                lineHeight: 1,
              }}
            >
              {labels[entry.result]}
            </div>
            {entry.bankerPair && (
              <div className="absolute" style={{ top: 0, left: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#DC2626' }} />
            )}
            {entry.playerPair && (
              <div className="absolute" style={{ bottom: 0, right: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#2563EB' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Big Road — hollow circles with tie counts and pair dots
function BigRoad({ grid, usedCols, width }: { grid: (BigRoadCell | null)[][]; usedCols: number; width: number }) {
  const ROWS = 6;
  const CELL = 13;
  const GAP = 1;
  const maxCols = Math.max(Math.floor((width + GAP) / (CELL + GAP)), 1);
  const displayCols = Math.max(usedCols, maxCols);
  const colOffset = Math.max(0, displayCols - maxCols);
  const visibleCols = Math.min(displayCols, maxCols);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < visibleCols; c++) {
      const cell = grid[r]?.[c + colOffset];
      const key = `br-${r}-${c}`;
      if (!cell) {
        cells.push(<div key={key} style={{ background: '#fff' }} />);
        continue;
      }
      const borderColor = cell.result === 'banker' ? '#DC2626' : '#2563EB';
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: '#fff' }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 10, height: 10, border: `2px solid ${borderColor}` }}
          >
            {cell.tieCount > 0 && (
              <span style={{ fontSize: '5px', color: '#16A34A', fontWeight: 'bold', lineHeight: 1 }}>
                {cell.tieCount}
              </span>
            )}
          </div>
          {cell.bankerPair && (
            <div className="absolute" style={{ top: 0, right: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#DC2626' }} />
          )}
          {cell.playerPair && (
            <div className="absolute" style={{ bottom: 0, left: 0, width: 3, height: 3, borderRadius: '50%', backgroundColor: '#2563EB' }} />
          )}
        </div>
      );
    }
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
        gridTemplateColumns: `repeat(${visibleCols}, ${CELL}px)`,
        gap: `${GAP}px`,
        backgroundColor: GRID_BG,
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
  const GAP = 1;
  const maxCols = Math.max(Math.floor((width + GAP) / (cellSize + GAP)), 1);
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
        cells.push(<div key={key} style={{ background: '#fff' }} />);
      } else {
        cells.push(
          <div key={key} className="flex items-center justify-center" style={{ background: '#fff' }}>
            {renderCell(val)}
          </div>
        );
      }
    }
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
        gridTemplateColumns: `repeat(${visibleCols}, ${cellSize}px)`,
        gap: `${GAP}px`,
        backgroundColor: GRID_BG,
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

  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, 6, 60), [bigRoadColumns]);
  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, 6, 60), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, 6, 40), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, 6, 40), [bigRoadColumns]);

  let bigRoadUsedCols = 0;
  for (let c = 0; c < 60; c++) {
    for (let r = 0; r < 6; r++) {
      if (bigRoadGrid[r][c]) bigRoadUsedCols = c + 1;
    }
  }

  // Dynamic widths: bead road ~35%, right roads ~65%
  const beadWidth = Math.floor(containerWidth * 0.34);
  const roadWidth = containerWidth - beadWidth - 1; // 1px gap
  const halfRoadWidth = Math.floor((roadWidth - 1) / 2);

  const renderBigEye = (val: 'red' | 'blue') => {
    const color = val === 'red' ? '#DC2626' : '#2563EB';
    return <div className="rounded-full" style={{ width: 5, height: 5, border: `1.5px solid ${color}` }} />;
  };

  const renderSmall = (val: 'red' | 'blue') => {
    const color = val === 'red' ? '#DC2626' : '#2563EB';
    return <div className="rounded-full" style={{ width: 5, height: 5, backgroundColor: color }} />;
  };

  const renderCockroach = (val: 'red' | 'blue') => {
    const color = val === 'red' ? '#DC2626' : '#2563EB';
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
    <div ref={containerRef} className="flex h-full overflow-hidden" style={{ gap: 1, backgroundColor: GRID_BG }}>
      {containerWidth > 0 && (
        <>
          {/* Left: Bead Road */}
          <div className="shrink-0 overflow-hidden" style={{ width: beadWidth }}>
            <BeadRoad data={roadHistory} width={beadWidth} />
          </div>

          {/* Right: Stacked roads */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: 1 }}>
            {/* Big Road */}
            <div className="overflow-hidden">
              <BigRoad grid={bigRoadGrid} usedCols={bigRoadUsedCols} width={roadWidth} />
            </div>

            {/* Big Eye Boy */}
            <div className="overflow-hidden">
              <DerivedRoad grid={bigEyeGrid} cellSize={7} renderCell={renderBigEye} keyPrefix="be" width={roadWidth} />
            </div>

            {/* Small Road + Cockroach Pig side by side */}
            <div className="flex overflow-hidden" style={{ gap: 1 }}>
              <div className="overflow-hidden">
                <DerivedRoad grid={smallGrid} cellSize={7} renderCell={renderSmall} keyPrefix="sr" width={halfRoadWidth} />
              </div>
              <div className="overflow-hidden">
                <DerivedRoad grid={cockroachGrid} cellSize={7} renderCell={renderCockroach} keyPrefix="cr" width={halfRoadWidth} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
