import { useMemo, memo } from 'react';
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

// Bead Road Grid — 6 rows, white cells, colored circles with Chinese labels
function BeadRoad({ data }: { data: RoadHistoryEntry[] }) {
  const ROWS = 6;
  const MAX_COLS = 10;
  // Show most recent data that fits
  const startIdx = Math.max(0, data.length - ROWS * MAX_COLS);
  const visibleData = data.slice(startIdx);
  const cols = Math.max(Math.ceil(visibleData.length / ROWS), 1);

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
    <div className="overflow-hidden">
      <div
        className="inline-grid"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 16px)`,
          gridTemplateColumns: `repeat(${cols}, 16px)`,
          gap: '1px',
          backgroundColor: '#D1D5DB',
        }}
      >
        {Array(ROWS).fill(null).flatMap((_, row) =>
          Array(cols).fill(null).map((_, col) => {
            const idx = col * ROWS + row;
            const entry = visibleData[idx];
            if (!entry) {
              return <div key={`b-${row}-${col}`} className="bg-white" style={{ width: 16, height: 16 }} />;
            }
            return (
              <div
                key={`b-${row}-${col}`}
                className="bg-white flex items-center justify-center relative"
                style={{ width: 16, height: 16 }}
              >
                <div
                  className="rounded-full flex items-center justify-center text-white font-bold"
                  style={{
                    width: 14,
                    height: 14,
                    backgroundColor: bgColors[entry.result],
                    fontSize: '8px',
                    lineHeight: 1,
                  }}
                >
                  {labels[entry.result]}
                </div>
                {entry.bankerPair && (
                  <div className="absolute" style={{ top: 0, left: 0, width: 4, height: 4, borderRadius: '50%', backgroundColor: '#DC2626' }} />
                )}
                {entry.playerPair && (
                  <div className="absolute" style={{ bottom: 0, right: 0, width: 4, height: 4, borderRadius: '50%', backgroundColor: '#2563EB' }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Big Road Grid — hollow circles with tie counts and pair dots
function BigRoadDisplay({ grid, usedCols }: { grid: (BigRoadCell | null)[][]; usedCols: number }) {
  const ROWS = 6;
  const displayCols = Math.max(usedCols, 1);
  // Show most recent columns that fit in ~20 cols
  const MAX_VISIBLE = 20;
  const colOffset = Math.max(0, displayCols - MAX_VISIBLE);
  const visibleCols = Math.min(displayCols, MAX_VISIBLE);

  return (
    <div className="overflow-hidden">
      <div
        className="inline-grid"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 14px)`,
          gridTemplateColumns: `repeat(${visibleCols}, 14px)`,
          gap: '1px',
          backgroundColor: '#D1D5DB',
        }}
      >
        {Array(ROWS).fill(null).flatMap((_, row) =>
          Array(visibleCols).fill(null).map((_, col) => {
            const cell = grid[row]?.[col + colOffset];
            if (!cell) {
              return <div key={`br-${row}-${col}`} className="bg-white" style={{ width: 14, height: 14 }} />;
            }
            const borderColor = cell.result === 'banker' ? '#DC2626' : '#2563EB';
            return (
              <div
                key={`br-${row}-${col}`}
                className="bg-white flex items-center justify-center relative"
                style={{ width: 14, height: 14 }}
              >
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 11,
                    height: 11,
                    border: `2px solid ${borderColor}`,
                  }}
                >
                  {cell.tieCount > 0 && (
                    <span style={{ fontSize: '6px', color: '#16A34A', fontWeight: 'bold', lineHeight: 1 }}>
                      {cell.tieCount}
                    </span>
                  )}
                </div>
                {cell.bankerPair && (
                  <div className="absolute" style={{ top: 0, right: 0, width: 4, height: 4, borderRadius: '50%', backgroundColor: '#DC2626' }} />
                )}
                {cell.playerPair && (
                  <div className="absolute" style={{ bottom: 0, left: 0, width: 4, height: 4, borderRadius: '50%', backgroundColor: '#2563EB' }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Big Eye Boy — hollow circles (smaller)
function BigEyeRoadDisplay({ grid }: { grid: ('red' | 'blue' | null)[][] }) {
  const ROWS = 6;
  let usedCols = 0;
  for (let c = 0; c < grid[0].length; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c]) usedCols = c + 1;
    }
  }
  const MAX_VISIBLE = 20;
  const displayCols = Math.max(usedCols, 1);
  const colOffset = Math.max(0, displayCols - MAX_VISIBLE);
  const visibleCols = Math.min(displayCols, MAX_VISIBLE);

  return (
    <div className="overflow-hidden">
      <div
        className="inline-grid"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 8px)`,
          gridTemplateColumns: `repeat(${visibleCols}, 8px)`,
          gap: '1px',
          backgroundColor: '#D1D5DB',
        }}
      >
        {Array(ROWS).fill(null).flatMap((_, row) =>
          Array(visibleCols).fill(null).map((_, col) => {
            const val = grid[row]?.[col + colOffset];
            if (!val) {
              return <div key={`be-${row}-${col}`} className="bg-white" style={{ width: 8, height: 8 }} />;
            }
            const color = val === 'red' ? '#DC2626' : '#2563EB';
            return (
              <div
                key={`be-${row}-${col}`}
                className="bg-white flex items-center justify-center"
                style={{ width: 8, height: 8 }}
              >
                <div
                  className="rounded-full"
                  style={{ width: 6, height: 6, border: `1.5px solid ${color}` }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Small Road — filled circles
function SmallRoadDisplay({ grid }: { grid: ('red' | 'blue' | null)[][] }) {
  const ROWS = 6;
  let usedCols = 0;
  for (let c = 0; c < grid[0].length; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c]) usedCols = c + 1;
    }
  }
  const MAX_VISIBLE = 10;
  const displayCols = Math.max(usedCols, 1);
  const colOffset = Math.max(0, displayCols - MAX_VISIBLE);
  const visibleCols = Math.min(displayCols, MAX_VISIBLE);

  return (
    <div className="overflow-hidden">
      <div
        className="inline-grid"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 7px)`,
          gridTemplateColumns: `repeat(${visibleCols}, 7px)`,
          gap: '1px',
          backgroundColor: '#D1D5DB',
        }}
      >
        {Array(ROWS).fill(null).flatMap((_, row) =>
          Array(visibleCols).fill(null).map((_, col) => {
            const val = grid[row]?.[col + colOffset];
            if (!val) {
              return <div key={`sr-${row}-${col}`} className="bg-white" style={{ width: 7, height: 7 }} />;
            }
            const color = val === 'red' ? '#DC2626' : '#2563EB';
            return (
              <div
                key={`sr-${row}-${col}`}
                className="bg-white flex items-center justify-center"
                style={{ width: 7, height: 7 }}
              >
                <div
                  className="rounded-full"
                  style={{ width: 5, height: 5, backgroundColor: color }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Cockroach Pig — diagonal lines
function CockroachRoadDisplay({ grid }: { grid: ('red' | 'blue' | null)[][] }) {
  const ROWS = 6;
  let usedCols = 0;
  for (let c = 0; c < grid[0].length; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c]) usedCols = c + 1;
    }
  }
  const MAX_VISIBLE = 10;
  const displayCols = Math.max(usedCols, 1);
  const colOffset = Math.max(0, displayCols - MAX_VISIBLE);
  const visibleCols = Math.min(displayCols, MAX_VISIBLE);

  return (
    <div className="overflow-hidden">
      <div
        className="inline-grid"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 7px)`,
          gridTemplateColumns: `repeat(${visibleCols}, 7px)`,
          gap: '1px',
          backgroundColor: '#D1D5DB',
        }}
      >
        {Array(ROWS).fill(null).flatMap((_, row) =>
          Array(visibleCols).fill(null).map((_, col) => {
            const val = grid[row]?.[col + colOffset];
            if (!val) {
              return <div key={`cr-${row}-${col}`} className="bg-white" style={{ width: 7, height: 7 }} />;
            }
            const color = val === 'red' ? '#DC2626' : '#2563EB';
            return (
              <div
                key={`cr-${row}-${col}`}
                className="bg-white flex items-center justify-center"
                style={{ width: 7, height: 7 }}
              >
                <div
                  style={{
                    width: 6,
                    height: 1.5,
                    backgroundColor: color,
                    transform: val === 'red' ? 'rotate(45deg)' : 'rotate(-45deg)',
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LobbyRoadmap({ roadHistory }: LobbyRoadmapProps) {
  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGrid = useMemo(() => buildBigRoadGrid(bigRoadColumns, 6, 40), [bigRoadColumns]);
  const bigEyeGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, 6, 40), [bigRoadColumns]);
  const smallGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, 6, 20), [bigRoadColumns]);
  const cockroachGrid = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, 6, 20), [bigRoadColumns]);

  // Calculate used columns for big road
  let bigRoadUsedCols = 0;
  for (let c = 0; c < 40; c++) {
    for (let r = 0; r < 6; r++) {
      if (bigRoadGrid[r][c]) bigRoadUsedCols = c + 1;
    }
  }

  return (
    <div className="flex h-full gap-px bg-[#D1D5DB]">
      {/* Left: Bead Road */}
      <div className="shrink-0">
        <BeadRoad data={roadHistory} />
      </div>

      {/* Right: Stacked roads */}
      <div className="flex-1 flex flex-col gap-px min-w-0">
        {/* Big Road */}
        <div className="flex-[3]">
          <BigRoadDisplay grid={bigRoadGrid} usedCols={bigRoadUsedCols} />
        </div>

        {/* Big Eye Boy */}
        <div className="flex-[2]">
          <BigEyeRoadDisplay grid={bigEyeGrid} />
        </div>

        {/* Small Road + Cockroach Pig side by side */}
        <div className="flex-[2] flex gap-px">
          <div className="flex-1">
            <SmallRoadDisplay grid={smallGrid} />
          </div>
          <div className="flex-1">
            <CockroachRoadDisplay grid={cockroachGrid} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(LobbyRoadmap);
