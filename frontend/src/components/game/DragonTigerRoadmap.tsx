import { useMemo, memo, useRef, useState, useLayoutEffect } from 'react';

interface DragonTigerRoadmapProps {
  roadHistory: Array<{ result: string }>;
  askRoadMode?: 'none' | 'dragon' | 'tiger';
  onToggleAskRoad?: (mode: 'dragon' | 'tiger') => void;
}

const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB';
const SEPARATOR = '#aaa';
const LARGE_COLS = 200;

function normalizeResult(result: string | undefined): 'dragon' | 'tiger' | 'tie' | undefined {
  if (!result) return undefined;
  if (result === 'dt_tie') return 'tie';
  if (result === 'dragon' || result === 'tiger' || result === 'tie') return result;
  return undefined;
}

export interface DTBigRoadCell { result: 'dragon' | 'tiger'; tieCount: number; }

export function buildDTBigRoadColumns(data: Array<{ result: string }>): DTBigRoadCell[][] {
  const columns: DTBigRoadCell[][] = [];
  let currentCol: DTBigRoadCell[] = [];
  let lastResult: 'dragon' | 'tiger' | null = null;
  for (const round of data) {
    const result = normalizeResult(round.result);
    if (result === 'tie') {
      if (currentCol.length > 0) currentCol[currentCol.length - 1].tieCount++;
      else if (columns.length > 0) { const prev = columns[columns.length - 1]; prev[prev.length - 1].tieCount++; }
      continue;
    }
    if (!result) continue;
    if (lastResult === null || result !== lastResult) {
      if (currentCol.length > 0) columns.push(currentCol);
      currentCol = [{ result, tieCount: 0 }]; lastResult = result;
    } else { currentCol.push({ result, tieCount: 0 }); }
  }
  if (currentCol.length > 0) columns.push(currentCol);
  return columns;
}

function buildDTBigRoadGrid(columns: DTBigRoadCell[][], rows: number, maxCols: number): (DTBigRoadCell | null)[][] {
  const grid: (DTBigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));
  let gridCol = 0;
  for (const column of columns) {
    let row = 0, col = gridCol;
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

export function buildDTDerivedRoad(columns: DTBigRoadCell[][], offset: number, maxRows: number, maxCols: number): ('red' | 'blue' | null)[][] {
  const grid: ('red' | 'blue' | null)[][] = Array(maxRows).fill(null).map(() => Array(maxCols).fill(null));
  const startCol = offset + 1;
  if (columns.length < startCol) return grid;
  const colorResults: ('red' | 'blue')[] = [];
  for (let colIdx = startCol - 1; colIdx < columns.length; colIdx++) {
    for (let entryIdx = 0; entryIdx < columns[colIdx].length; entryIdx++) {
      if (colIdx === startCol - 1 && entryIdx === 0) continue;
      let color: 'red' | 'blue';
      if (entryIdx === 0) {
        const prevColLen = columns[colIdx - 1].length;
        const refColLen = (colIdx - 1 - offset) >= 0 ? columns[colIdx - 1 - offset].length : 0;
        color = prevColLen === refColLen ? 'red' : 'blue';
      } else {
        const compareColLen = (colIdx - offset) >= 0 ? columns[colIdx - offset].length : 0;
        color = compareColLen > entryIdx ? 'red' : (compareColLen === entryIdx ? 'blue' : 'red');
      }
      colorResults.push(color);
    }
  }
  const derivedColumns: ('red' | 'blue')[][] = [];
  let curCol: ('red' | 'blue')[] = [], lastColor: 'red' | 'blue' | null = null;
  for (const c of colorResults) {
    if (lastColor !== null && c !== lastColor) { if (curCol.length > 0) derivedColumns.push(curCol); curCol = [c]; }
    else { curCol.push(c); }
    lastColor = c;
  }
  if (curCol.length > 0) derivedColumns.push(curCol);
  let gCol = 0;
  for (const column of derivedColumns) {
    let row = 0, col = gCol;
    for (const c of column) {
      if (row >= maxRows) { col++; row = maxRows - 1; }
      while (col < maxCols && grid[row][col] !== null) col++;
      if (col < maxCols) grid[row][col] = c;
      row++;
    }
    gCol = col + 1;
  }
  return grid;
}

function calculateDTNextPrediction(columns: DTBigRoadCell[][], nextResult: 'dragon' | 'tiger'): {
  bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null;
} {
  if (columns.length === 0) return { bigEye: null, small: null, cockroach: null };
  const lastCol = columns[columns.length - 1];
  let newCols: DTBigRoadCell[][];
  if (nextResult === lastCol[0].result) newCols = [...columns.slice(0, -1), [...lastCol, { result: nextResult, tieCount: 0 }]];
  else newCols = [...columns, [{ result: nextResult, tieCount: 0 }]];
  const calc = (offset: number): 'red' | 'blue' | null => {
    const sc = offset + 1;
    if (newCols.length < sc) return null;
    const ci = newCols.length - 1, ei = newCols[ci].length - 1;
    if (ci === sc - 1 && ei === 0) return null;
    if (ei === 0) { const pl = newCols[ci - 1].length; const rl = (ci - 1 - offset) >= 0 ? newCols[ci - 1 - offset].length : 0; return pl === rl ? 'red' : 'blue'; }
    else { const cl = (ci - offset) >= 0 ? newCols[ci - offset].length : 0; return cl > ei ? 'red' : (cl === ei ? 'blue' : 'red'); }
  };
  return { bigEye: calc(1), small: calc(2), cockroach: calc(3) };
}

// ── Bead Road ──
function BeadRoad({ data, rows, cols, predictedCount }: {
  data: Array<{ result: string }>; rows: number; cols: number; predictedCount: number;
}) {
  const startIdx = Math.max(0, data.length - rows * cols);
  const vis = data.slice(startIdx);
  const realCount = data.length - predictedCount;
  const bg: Record<string, string> = { dragon: '#ef4444', tiger: '#3b82f6', tie: '#22c55e' };
  const lb: Record<string, string> = { dragon: '龍', tiger: '虎', tie: '和' };
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const di = c * rows + r;
      const entry = vis[di];
      const key = `b-${r}-${c}`;
      const res = entry ? normalizeResult(entry.result) : null;
      if (!res) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }
      const isPred = predictedCount > 0 && (startIdx + di) >= realCount;
      const blink = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: '80%', aspectRatio: '1', maxWidth: 16, backgroundColor: bg[res], ...blink }}>
            <span style={{ color: '#FFF', fontSize: '6px', fontWeight: 'bold', lineHeight: 1 }}>{lb[res]}</span>
          </div>
        </div>
      );
    }
  }
  return <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE }}>{cells}</div>;
}

// ── Big Road ──
function BigRoad({ grid, rows, cols, predictedCells }: {
  grid: (DTBigRoadCell | null)[][]; rows: number; cols: number; predictedCells?: Set<string>;
}) {
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cell = grid[r]?.[c] ?? null;
      const key = `br-${r}-${c}`;
      if (!cell) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }
      const color = cell.result === 'dragon' ? '#ef4444' : '#3b82f6';
      const isPred = predictedCells?.has(`${r}-${c}`) ?? false;
      const blink = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full" style={{ width: '70%', aspectRatio: '1', maxWidth: 12, border: `1.5px solid ${color}`, ...blink }}>
            {cell.tieCount > 0 && <span className="flex items-center justify-center font-bold" style={{ fontSize: '5px', lineHeight: '6px', color: '#22c55e' }}>{cell.tieCount}</span>}
          </div>
        </div>
      );
    }
  }
  return <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE }}>{cells}</div>;
}

// ── Derived Road (2×2 mini cells) ──
function DerivedRoadGrid({ grid, type, rows, cols, predictedCells }: {
  grid: ('red' | 'blue' | null)[][]; type: 'big_eye' | 'small' | 'cockroach'; rows: number; cols: number; predictedCells?: Set<string>;
}) {
  const vR = Math.ceil(rows / 2), vC = Math.ceil(cols / 2);
  const cells: React.ReactNode[] = [];
  for (let vc = 0; vc < vC; vc++) {
    for (let vr = 0; vr < vR; vr++) {
      const key = `d-${vr}-${vc}`;
      const ms: React.ReactNode[] = [];
      for (let mr = 0; mr < 2; mr++) {
        for (let mc = 0; mc < 2; mc++) {
          const dr = vr * 2 + mr, dc = vc * 2 + mc;
          const v = grid[dr]?.[dc] ?? null;
          const mk = `m-${mr}-${mc}`;
          if (!v) { ms.push(<div key={mk} />); continue; }
          const isPred = predictedCells?.has(`${dr}-${dc}`) ?? false;
          const blink = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
          const c = v === 'red' ? '#ef4444' : '#3b82f6';
          if (type === 'big_eye') ms.push(<div key={mk} className="flex items-center justify-center"><div className="rounded-full" style={{ width: 5, height: 5, border: `1px solid ${c}`, ...blink }} /></div>);
          else if (type === 'small') ms.push(<div key={mk} className="flex items-center justify-center"><div className="rounded-full" style={{ width: 5, height: 5, backgroundColor: c, ...blink }} /></div>);
          else ms.push(<div key={mk} className="flex items-center justify-center" style={blink}><svg viewBox="0 0 10 10" style={{ width: 6, height: 6 }}><line x1="1" y1="9" x2="9" y2="1" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg></div>);
        }
      }
      cells.push(<div key={key} className="grid" style={{ gridTemplateRows: 'repeat(2,1fr)', gridTemplateColumns: 'repeat(2,1fr)', background: CELL_BG }}>{ms}</div>);
    }
  }
  return <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${vR}, 1fr)`, gridTemplateColumns: `repeat(${vC}, 1fr)`, gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE }}>{cells}</div>;
}

// ── Prediction dots ──
function PredictionDots({ bigEye, small, cockroach }: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null }) {
  const c = (v: 'red' | 'blue' | null) => v === 'red' ? '#ef4444' : v === 'blue' ? '#3b82f6' : '#999';
  return (
    <span className="inline-flex items-center gap-px ml-0.5">
      <span className="inline-block rounded-full" style={{ width: 5, height: 5, border: `1px solid ${c(bigEye)}` }} />
      <span className="inline-block rounded-full" style={{ width: 5, height: 5, backgroundColor: c(small) }} />
      <span className="inline-block" style={{ width: 5, height: 1.5, backgroundColor: c(cockroach), transform: 'rotate(-45deg)' }} />
    </span>
  );
}

// ══════════════════════════════════════════
// Main Component — Layout matching reference:
//  Row 1: [珠盤路 6×6] | [大路 14×6]
//  Row 2: [大眼路] | [小路] | [蟑螂路]  (each 10×6 data = 5×3 visual)
//  Row 3: Stats bar
// ══════════════════════════════════════════
function DragonTigerRoadmap({ roadHistory, askRoadMode, onToggleAskRoad }: DragonTigerRoadmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => { const w = entries[0]?.contentRect.width ?? 0; if (w > 0) setContainerWidth(w); });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isAskActive = askRoadMode && askRoadMode !== 'none';
  const simHistory = useMemo(() => isAskActive ? [...roadHistory, { result: askRoadMode! }] : roadHistory, [roadHistory, askRoadMode, isAskActive]);
  const predictedCount = isAskActive ? 1 : 0;

  const BEAD_ROWS = 6, BEAD_COLS = 6;
  const BR_ROWS = 6, BR_COLS = 14;
  const DR_ROWS = 6, DR_COLS = 20;

  const realCols = useMemo(() => buildDTBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadCols = useMemo(() => isAskActive ? buildDTBigRoadColumns(simHistory) : realCols, [simHistory, realCols, isAskActive]);
  const brGL = useMemo(() => buildDTBigRoadGrid(bigRoadCols, BR_ROWS, LARGE_COLS), [bigRoadCols]);
  const rBrGL = useMemo(() => isAskActive ? buildDTBigRoadGrid(realCols, BR_ROWS, LARGE_COLS) : brGL, [realCols, brGL, isAskActive]);

  let maxC = 0;
  for (let c = 0; c < LARGE_COLS; c++) for (let r = 0; r < BR_ROWS; r++) if (brGL[r]?.[c]) maxC = c;
  const brOff = Math.max(0, maxC - BR_COLS + 1);

  const brGrid = useMemo(() => {
    const g: (DTBigRoadCell | null)[][] = Array(BR_ROWS).fill(null).map(() => Array(BR_COLS).fill(null));
    for (let r = 0; r < BR_ROWS; r++) for (let c = 0; c < BR_COLS; c++) g[r][c] = brGL[r]?.[c + brOff] ?? null;
    return g;
  }, [brGL, brOff]);

  const brPred = useMemo(() => {
    if (!isAskActive) return undefined;
    const s = new Set<string>();
    for (let r = 0; r < BR_ROWS; r++) for (let c = 0; c < LARGE_COLS; c++) {
      if (brGL[r]?.[c] && !rBrGL[r]?.[c]) { const wc = c - brOff; if (wc >= 0 && wc < BR_COLS) s.add(`${r}-${wc}`); }
    }
    return s.size > 0 ? s : undefined;
  }, [brGL, rBrGL, isAskActive, brOff]);

  const beL = useMemo(() => buildDTDerivedRoad(bigRoadCols, 1, DR_ROWS, LARGE_COLS), [bigRoadCols]);
  const srL = useMemo(() => buildDTDerivedRoad(bigRoadCols, 2, DR_ROWS, LARGE_COLS), [bigRoadCols]);
  const crL = useMemo(() => buildDTDerivedRoad(bigRoadCols, 3, DR_ROWS, LARGE_COLS), [bigRoadCols]);
  const rBeL = useMemo(() => isAskActive ? buildDTDerivedRoad(realCols, 1, DR_ROWS, LARGE_COLS) : beL, [realCols, beL, isAskActive]);
  const rSrL = useMemo(() => isAskActive ? buildDTDerivedRoad(realCols, 2, DR_ROWS, LARGE_COLS) : srL, [realCols, srL, isAskActive]);
  const rCrL = useMemo(() => isAskActive ? buildDTDerivedRoad(realCols, 3, DR_ROWS, LARGE_COLS) : crL, [realCols, crL, isAskActive]);

  const extWin = (large: ('red' | 'blue' | null)[][], cols: number) => {
    let mx = 0;
    for (let c = 0; c < LARGE_COLS; c++) for (let r = 0; r < DR_ROWS; r++) if (large[r]?.[c]) mx = c;
    const off = Math.max(0, mx - cols + 1);
    const g: ('red' | 'blue' | null)[][] = Array(DR_ROWS).fill(null).map(() => Array(cols).fill(null));
    for (let r = 0; r < DR_ROWS; r++) for (let c = 0; c < cols; c++) g[r][c] = large[r]?.[c + off] ?? null;
    return { grid: g, offset: off };
  };
  const { grid: beG, offset: beOff } = useMemo(() => extWin(beL, DR_COLS), [beL]);
  const { grid: srG, offset: srOff } = useMemo(() => extWin(srL, DR_COLS), [srL]);
  const { grid: crG, offset: crOff } = useMemo(() => extWin(crL, DR_COLS), [crL]);

  const mkP = (full: ('red' | 'blue' | null)[][], real: ('red' | 'blue' | null)[][], off: number, cols: number) => {
    if (!isAskActive) return undefined;
    const s = new Set<string>();
    for (let r = 0; r < DR_ROWS; r++) for (let c = 0; c < LARGE_COLS; c++) { if (full[r]?.[c] && !real[r]?.[c]) { const wc = c - off; if (wc >= 0 && wc < cols) s.add(`${r}-${wc}`); } }
    return s.size > 0 ? s : undefined;
  };
  const bePred = useMemo(() => mkP(beL, rBeL, beOff, DR_COLS), [beL, rBeL, beOff, isAskActive]);
  const srPred = useMemo(() => mkP(srL, rSrL, srOff, DR_COLS), [srL, rSrL, srOff, isAskActive]);
  const crPred = useMemo(() => mkP(crL, rCrL, crOff, DR_COLS), [crL, rCrL, crOff, isAskActive]);

  const nextDragon = useMemo(() => calculateDTNextPrediction(realCols, 'dragon'), [realCols]);
  const nextTiger = useMemo(() => calculateDTNextPrediction(realCols, 'tiger'), [realCols]);

  const stats = useMemo(() => {
    let d = 0, t = 0, tie = 0;
    for (const e of roadHistory) { const r = normalizeResult(e.result); if (r === 'dragon') d++; else if (r === 'tiger') t++; else if (r === 'tie') tie++; }
    return { dragon: d, tiger: t, tie, total: roadHistory.length };
  }, [roadHistory]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Row 1: 珠盤路 + 大路 */}
          <div className="flex" style={{ flex: '6', borderBottom: `2px solid ${SEPARATOR}` }}>
            <div className="h-full shrink-0" style={{ width: `${(BEAD_COLS / (BEAD_COLS + BR_COLS)) * 100}%`, borderRight: `2px solid ${SEPARATOR}` }}>
              <BeadRoad data={simHistory} rows={BEAD_ROWS} cols={BEAD_COLS} predictedCount={predictedCount} />
            </div>
            <div className="h-full flex-1">
              <BigRoad grid={brGrid} rows={BR_ROWS} cols={BR_COLS} predictedCells={brPred} />
            </div>
          </div>

          {/* Row 2: 大眼路 + 小路 + 蟑螂路 */}
          <div className="flex" style={{ flex: '3', borderBottom: `2px solid ${SEPARATOR}` }}>
            <div className="h-full flex-1" style={{ borderRight: `2px solid ${SEPARATOR}` }}>
              <DerivedRoadGrid grid={beG} type="big_eye" rows={DR_ROWS} cols={DR_COLS} predictedCells={bePred} />
            </div>
            <div className="h-full flex-1" style={{ borderRight: `2px solid ${SEPARATOR}` }}>
              <DerivedRoadGrid grid={srG} type="small" rows={DR_ROWS} cols={DR_COLS} predictedCells={srPred} />
            </div>
            <div className="h-full flex-1">
              <DerivedRoadGrid grid={crG} type="cockroach" rows={DR_ROWS} cols={DR_COLS} predictedCells={crPred} />
            </div>
          </div>

          {/* Row 3: Stats */}
          <div className="shrink-0 flex items-center justify-between px-2" style={{ height: 20, backgroundColor: CELL_BG, fontSize: '9px', fontWeight: 'bold' }}>
            <div className="flex items-center gap-2">
              <span style={{ color: '#ef4444' }}>龍 <span className="text-gray-800">{stats.dragon}</span></span>
              <span style={{ color: '#3b82f6' }}>虎 <span className="text-gray-800">{stats.tiger}</span></span>
              <span style={{ color: '#22c55e' }}>和 <span className="text-gray-800">{stats.tie}</span></span>
              <span className="text-gray-500">總 <span className="text-gray-800">{stats.total}</span></span>
            </div>
            {onToggleAskRoad && (
              <div className="flex items-center gap-2">
                <button onClick={() => onToggleAskRoad('dragon')} className={`flex items-center ${askRoadMode === 'dragon' ? 'underline' : ''}`} style={{ color: '#ef4444' }}>
                  龍問路<PredictionDots {...nextDragon} />
                </button>
                <button onClick={() => onToggleAskRoad('tiger')} className={`flex items-center ${askRoadMode === 'tiger' ? 'underline' : ''}`} style={{ color: '#3b82f6' }}>
                  虎問路<PredictionDots {...nextTiger} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(DragonTigerRoadmap);
