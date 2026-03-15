import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface DTRoadmapEntry {
  result: string;
}

interface DTRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DTRoadmapEntry[];
}

type RoadType = 'bead' | 'big' | 'bigEye' | 'small' | 'cockroach';

const CELL_BG = '#1e2433';
const LINE_COLOR = '#2a3142';

// Normalize result
function normalizeResult(result: string | undefined): 'dragon' | 'tiger' | 'tie' | undefined {
  if (!result) return undefined;
  if (result === 'dt_tie') return 'tie';
  if (result === 'dragon' || result === 'tiger' || result === 'tie') return result;
  return undefined;
}

// DT Big Road cell
interface DTBigRoadCell {
  result: 'dragon' | 'tiger';
  tieCount: number;
}

// Build Big Road columns
function buildDTBigRoadColumns(data: DTRoadmapEntry[]): DTBigRoadCell[][] {
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

// Build Big Road grid with dragon tail
function buildDTBigRoadGrid(columns: DTBigRoadCell[][], rows: number, maxCols: number): (DTBigRoadCell | null)[][] {
  const grid: (DTBigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));
  let gridCol = 0;

  for (const column of columns) {
    let row = 0;
    let col = gridCol;

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

// Build derived road
function buildDTDerivedRoad(
  columns: DTBigRoadCell[][],
  offset: number,
  maxRows: number,
  maxCols: number
): ('red' | 'blue' | null)[][] {
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

  // Group into columns by color
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

  // Place in grid with dragon tail
  let gridCol = 0;
  for (const column of derivedColumns) {
    let row = 0;
    let col = gridCol;
    for (const color of column) {
      if (row >= maxRows) { col++; row = maxRows - 1; }
      while (col < maxCols && grid[row][col] !== null) col++;
      if (col < maxCols) grid[row][col] = color;
      row++;
    }
    gridCol = col + 1;
  }

  return grid;
}

export default function DTRoadmapModal({ isOpen, onClose, data }: DTRoadmapModalProps) {
  const { t } = useTranslation();
  const [activeRoad, setActiveRoad] = useState<RoadType>('bead');

  const bigRoadColumns = useMemo(() => buildDTBigRoadColumns(data), [data]);

  const tabs: { type: RoadType; label: string }[] = [
    { type: 'bead', label: '珠盤路' },
    { type: 'big', label: '大路' },
    { type: 'bigEye', label: '大眼路' },
    { type: 'small', label: '小路' },
    { type: 'cockroach', label: '蟑螂路' },
  ];

  // ── Bead Road ──
  const renderBeadRoad = () => {
    const ROWS = 6;
    const totalCols = Math.max(Math.ceil(data.length / ROWS), 10);

    const cells: React.ReactNode[] = [];
    for (let c = 0; c < totalCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const idx = c * ROWS + r;
        const entry = data[idx];
        const key = `bead-${r}-${c}`;
        const result = entry ? normalizeResult(entry.result) : null;

        if (!result) {
          cells.push(<div key={key} style={{ background: CELL_BG }} />);
          continue;
        }

        const bgColors: Record<string, string> = { dragon: '#ef4444', tiger: '#3b82f6', tie: '#22c55e' };
        const labels: Record<string, string> = { dragon: '龍', tiger: '虎', tie: '和' };

        cells.push(
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 22, height: 22, backgroundColor: bgColors[result] }}
            >
              <span style={{ color: '#FFFFFF', fontSize: '9px', fontWeight: 'bold', lineHeight: 1 }}>{labels[result]}</span>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateRows: `repeat(${ROWS}, 28px)`,
            gridTemplateColumns: `repeat(${totalCols}, 28px)`,
            gridAutoFlow: 'column',
            gap: '1px',
            backgroundColor: LINE_COLOR,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  // ── Big Road ──
  const renderBigRoad = () => {
    const ROWS = 6;
    const LARGE_COLS = 200;
    const gridLarge = buildDTBigRoadGrid(bigRoadColumns, ROWS, LARGE_COLS);

    let maxUsedCol = 0;
    for (let c = 0; c < LARGE_COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (gridLarge[r][c]) maxUsedCol = c;
      }
    }
    const displayCols = Math.max(maxUsedCol + 1, 14);

    const cells: React.ReactNode[] = [];
    for (let c = 0; c < displayCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = gridLarge[r]?.[c] ?? null;
        const key = `br-${r}-${c}`;

        if (!cell) {
          cells.push(<div key={key} style={{ background: CELL_BG }} />);
          continue;
        }

        const borderColor = cell.result === 'dragon' ? '#ef4444' : '#3b82f6';
        cells.push(
          <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
            <div
              className="rounded-full"
              style={{ width: 18, height: 18, border: `2px solid ${borderColor}` }}
            >
              {cell.tieCount > 0 && (
                <span className="flex items-center justify-center font-bold" style={{ fontSize: '8px', lineHeight: '14px', color: '#22c55e' }}>
                  {cell.tieCount}
                </span>
              )}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateRows: `repeat(${ROWS}, 28px)`,
            gridTemplateColumns: `repeat(${displayCols}, 28px)`,
            gridAutoFlow: 'column',
            gap: '1px',
            backgroundColor: LINE_COLOR,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  // ── Derived Roads ──
  const renderDerivedRoad = (type: 'bigEye' | 'small' | 'cockroach') => {
    const offset = type === 'bigEye' ? 1 : type === 'small' ? 2 : 3;
    const ROWS = 6;
    const LARGE_COLS = 200;
    const grid = buildDTDerivedRoad(bigRoadColumns, offset, ROWS, LARGE_COLS);

    let maxUsedCol = 0;
    for (let c = 0; c < LARGE_COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c]) maxUsedCol = c;
      }
    }
    const displayCols = Math.max(maxUsedCol + 1, 14);

    const cells: React.ReactNode[] = [];
    for (let c = 0; c < displayCols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const value = grid[r]?.[c] ?? null;
        const key = `dr-${r}-${c}`;

        if (!value) {
          cells.push(<div key={key} style={{ background: CELL_BG }} />);
          continue;
        }

        const color = value === 'red' ? '#ef4444' : '#3b82f6';

        if (type === 'bigEye') {
          cells.push(
            <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
              <div className="rounded-full" style={{ width: 12, height: 12, border: `2px solid ${color}` }} />
            </div>
          );
        } else if (type === 'small') {
          cells.push(
            <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
              <div className="rounded-full" style={{ width: 10, height: 10, backgroundColor: color }} />
            </div>
          );
        } else {
          cells.push(
            <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
              <svg viewBox="0 0 10 10" style={{ width: 12, height: 12 }}>
                <line x1="1" y1="9" x2="9" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          );
        }
      }
    }

    return (
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateRows: `repeat(${ROWS}, 20px)`,
            gridTemplateColumns: `repeat(${displayCols}, 20px)`,
            gridAutoFlow: 'column',
            gap: '1px',
            backgroundColor: LINE_COLOR,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  const dragonWins = data.filter(r => normalizeResult(r.result) === 'dragon').length;
  const tigerWins = data.filter(r => normalizeResult(r.result) === 'tiger').length;
  const ties = data.filter(r => normalizeResult(r.result) === 'tie').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#141922] rounded-xl w-[95vw] sm:w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <h3 className="text-white font-bold">{t('roadmap') || '路單'}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700/50">
              {tabs.map((tab) => (
                <button
                  key={tab.type}
                  onClick={() => setActiveRoad(tab.type)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                    activeRoad === tab.type
                      ? 'bg-gray-700/50 text-amber-400 border-b-2 border-amber-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-3 overflow-auto">
              {activeRoad === 'bead' && renderBeadRoad()}
              {activeRoad === 'big' && renderBigRoad()}
              {activeRoad === 'bigEye' && renderDerivedRoad('bigEye')}
              {activeRoad === 'small' && renderDerivedRoad('small')}
              {activeRoad === 'cockroach' && renderDerivedRoad('cockroach')}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around py-2 border-t border-gray-700/50">
              <span className="text-red-500 font-bold text-sm">龍 <span className="text-white">{dragonWins}</span></span>
              <span className="text-blue-500 font-bold text-sm">虎 <span className="text-white">{tigerWins}</span></span>
              <span className="text-green-500 font-bold text-sm">和 <span className="text-white">{ties}</span></span>
              <span className="text-gray-400 text-sm">總 <span className="text-white">{data.length}</span></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
