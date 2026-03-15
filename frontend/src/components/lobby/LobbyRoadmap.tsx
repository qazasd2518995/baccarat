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
  predictedCount?: number;
  askRoadMode?: 'none' | 'banker' | 'player';
  onToggleAskRoad?: (mode: 'banker' | 'player') => void;
  bankerAskPrediction?: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
  playerAskPrediction?: { bigEye: 'red' | 'blue' | null; small: 'red' | 'blue' | null; cockroach: 'red' | 'blue' | null };
}

const CELL_BG = '#FFFFFF';
const LINE = '#D1D5DB';
const SEPARATOR = '#aaa';
const LARGE_COLS = 200;

// ── Bead Road (珠盤路) — solid circles with text ──
function BeadRoad({ grid, rows, cols, totalEntries, predictedCount }: {
  grid: (RoadHistoryEntry | null)[][]; rows: number; cols: number; totalEntries: number; predictedCount: number;
}) {
  const totalGridCols = grid[0]?.length ?? 0;
  const colOffset = Math.max(0, totalGridCols - cols);
  const realCount = totalEntries - predictedCount;
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const entry = grid[r]?.[c + colOffset] ?? null;
      const key = `bead-${r}-${c}`;
      if (!entry) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }
      const entryIndex = (c + colOffset) * rows + r;
      const isPred = predictedCount > 0 && entryIndex >= realCount;
      let bgColor = '#FFFFFF', text = '';
      if (entry.result === 'banker') { bgColor = '#DC2626'; text = '莊'; }
      else if (entry.result === 'player') { bgColor = '#2563EB'; text = '閒'; }
      else if (entry.result === 'tie') { bgColor = '#16A34A'; text = '和'; }
      const blink = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: '80%', aspectRatio: '1', maxWidth: 16, backgroundColor: bgColor, ...blink }}>
            <span style={{ color: '#FFF', fontSize: '6px', fontWeight: 'bold', lineHeight: 1 }}>{text}</span>
          </div>
        </div>
      );
    }
  }
  return (
    <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE }}>
      {cells}
    </div>
  );
}

// ── Big Road (大路) — hollow circles ──
function BigRoad({ grid, rows, cols, predictedCells }: {
  grid: (BigRoadCell | null)[][]; rows: number; cols: number; predictedCells?: Set<string>;
}) {
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cell = grid[r]?.[c] ?? null;
      const key = `br-${r}-${c}`;
      if (!cell) { cells.push(<div key={key} style={{ background: CELL_BG }} />); continue; }
      const color = cell.result === 'banker' ? '#DC2626' : '#2563EB';
      const isPred = predictedCells?.has(`${r}-${c}`) ?? false;
      const blink = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
      cells.push(
        <div key={key} className="relative flex items-center justify-center" style={{ background: CELL_BG }}>
          <div className="rounded-full" style={{ width: '70%', aspectRatio: '1', maxWidth: 12, border: `1.5px solid ${color}`, ...blink }} />
          {cell.tieCount > 0 && (
            <div className="absolute" style={{ width: '60%', maxWidth: 10, height: '1px', backgroundColor: '#16A34A', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-45deg)' }} />
          )}
        </div>
      );
    }
  }
  return (
    <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE }}>
      {cells}
    </div>
  );
}

// ── Derived Road (下三路) — 2×2 mini cells per visual grid cell ──
function DerivedRoadGrid({ grid, type, rows, cols, predictedCells }: {
  grid: ('red' | 'blue' | null)[][]; type: 'big_eye' | 'small' | 'cockroach'; rows: number; cols: number; predictedCells?: Set<string>;
}) {
  // 6 data rows → 3 visual rows, N data cols → N/2 visual cols
  const vRows = Math.ceil(rows / 2);
  const vCols = Math.ceil(cols / 2);
  const gridCells: React.ReactNode[] = [];

  for (let vc = 0; vc < vCols; vc++) {
    for (let vr = 0; vr < vRows; vr++) {
      const key = `d-${vr}-${vc}`;
      const minis: React.ReactNode[] = [];
      for (let mr = 0; mr < 2; mr++) {
        for (let mc = 0; mc < 2; mc++) {
          const dr = vr * 2 + mr, dc = vc * 2 + mc;
          const val = grid[dr]?.[dc] ?? null;
          const mk = `m-${mr}-${mc}`;
          if (!val) { minis.push(<div key={mk} />); continue; }
          const isPred = predictedCells?.has(`${dr}-${dc}`) ?? false;
          const blink = isPred ? { animation: 'askBlink 0.6s ease-in-out infinite' } : {};
          const c = val === 'red' ? '#DC2626' : '#2563EB';
          if (type === 'big_eye') {
            minis.push(<div key={mk} className="flex items-center justify-center"><div className="rounded-full" style={{ width: 5, height: 5, border: `1px solid ${c}`, ...blink }} /></div>);
          } else if (type === 'small') {
            minis.push(<div key={mk} className="flex items-center justify-center"><div className="rounded-full" style={{ width: 5, height: 5, backgroundColor: c, ...blink }} /></div>);
          } else {
            minis.push(<div key={mk} className="flex items-center justify-center" style={blink}><svg viewBox="0 0 10 10" style={{ width: 6, height: 6 }}><line x1="1" y1="9" x2="9" y2="1" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg></div>);
          }
        }
      }
      gridCells.push(
        <div key={key} className="grid" style={{ gridTemplateRows: 'repeat(2,1fr)', gridTemplateColumns: 'repeat(2,1fr)', background: CELL_BG }}>
          {minis}
        </div>
      );
    }
  }
  return (
    <div className="grid h-full w-full" style={{ gridTemplateRows: `repeat(${vRows}, 1fr)`, gridTemplateColumns: `repeat(${vCols}, 1fr)`, gridAutoFlow: 'column', gap: '1px', backgroundColor: LINE }}>
      {gridCells}
    </div>
  );
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
// ── Main Component ──
// Layout (matching reference image):
//  Row 1: [珠盤路 6×6] | [大路 14×6]
//  Row 2: [大眼路 10×6] | [小路 10×6] | [蟑螂路 10×6]  (each 2×2 mini = 3 visual rows)
//  Row 3: Stats bar
// ══════════════════════════════════════════
function LobbyRoadmap({
  roadHistory, predictedCount = 0, askRoadMode, onToggleAskRoad, bankerAskPrediction, playerAskPrediction,
}: LobbyRoadmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => { const w = entries[0]?.contentRect.width ?? 0; if (w > 0) setContainerWidth(w); });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Grid dimensions
  const BEAD_ROWS = 6, BEAD_COLS = 6;
  const BR_ROWS = 6, BR_COLS = 14;
  const DR_ROWS = 6, DR_COLS = 20;

  // Build grids
  const bigRoadColumns = useMemo(() => buildBigRoadColumns(roadHistory), [roadHistory]);
  const bigRoadGridLarge = useMemo(() => buildBigRoadGrid(bigRoadColumns, BR_ROWS, LARGE_COLS), [bigRoadColumns]);
  const beadRoadGrid = useMemo(() => buildBeadRoadGrid(roadHistory, BEAD_ROWS), [roadHistory]);

  const realHistory = useMemo(() => predictedCount > 0 ? roadHistory.slice(0, -predictedCount) : roadHistory, [roadHistory, predictedCount]);
  const realBigRoadColumns = useMemo(() => predictedCount > 0 ? buildBigRoadColumns(realHistory) : bigRoadColumns, [realHistory, predictedCount, bigRoadColumns]);
  const realBigRoadGridLarge = useMemo(() => predictedCount > 0 ? buildBigRoadGrid(realBigRoadColumns, BR_ROWS, LARGE_COLS) : bigRoadGridLarge, [realBigRoadColumns, predictedCount, bigRoadGridLarge]);

  // Big road sliding window
  let maxUsedCol = 0;
  for (let c = 0; c < LARGE_COLS; c++) { for (let r = 0; r < BR_ROWS; r++) { if (bigRoadGridLarge[r]?.[c]) maxUsedCol = c; } }
  const brOffset = Math.max(0, maxUsedCol - BR_COLS + 1);

  const bigRoadGrid = useMemo(() => {
    const g: (BigRoadCell | null)[][] = Array(BR_ROWS).fill(null).map(() => Array(BR_COLS).fill(null));
    for (let r = 0; r < BR_ROWS; r++) for (let c = 0; c < BR_COLS; c++) g[r][c] = bigRoadGridLarge[r]?.[c + brOffset] ?? null;
    return g;
  }, [bigRoadGridLarge, brOffset]);

  const brPredCells = useMemo(() => {
    if (predictedCount === 0) return undefined;
    const s = new Set<string>();
    for (let r = 0; r < BR_ROWS; r++) for (let c = 0; c < LARGE_COLS; c++) {
      if (bigRoadGridLarge[r]?.[c] && !realBigRoadGridLarge[r]?.[c]) { const wc = c - brOffset; if (wc >= 0 && wc < BR_COLS) s.add(`${r}-${wc}`); }
    }
    return s.size > 0 ? s : undefined;
  }, [bigRoadGridLarge, realBigRoadGridLarge, predictedCount, brOffset]);

  // Derived roads
  const beL = useMemo(() => buildDerivedRoad(bigRoadColumns, 1, DR_ROWS, LARGE_COLS), [bigRoadColumns]);
  const srL = useMemo(() => buildDerivedRoad(bigRoadColumns, 2, DR_ROWS, LARGE_COLS), [bigRoadColumns]);
  const crL = useMemo(() => buildDerivedRoad(bigRoadColumns, 3, DR_ROWS, LARGE_COLS), [bigRoadColumns]);
  const rBeL = useMemo(() => predictedCount > 0 ? buildDerivedRoad(realBigRoadColumns, 1, DR_ROWS, LARGE_COLS) : beL, [realBigRoadColumns, predictedCount, beL]);
  const rSrL = useMemo(() => predictedCount > 0 ? buildDerivedRoad(realBigRoadColumns, 2, DR_ROWS, LARGE_COLS) : srL, [realBigRoadColumns, predictedCount, srL]);
  const rCrL = useMemo(() => predictedCount > 0 ? buildDerivedRoad(realBigRoadColumns, 3, DR_ROWS, LARGE_COLS) : crL, [realBigRoadColumns, predictedCount, crL]);

  const extractWin = (large: ('red' | 'blue' | null)[][], cols: number) => {
    let mx = 0;
    for (let c = 0; c < LARGE_COLS; c++) for (let r = 0; r < DR_ROWS; r++) if (large[r]?.[c]) mx = c;
    const off = Math.max(0, mx - cols + 1);
    const g: ('red' | 'blue' | null)[][] = Array(DR_ROWS).fill(null).map(() => Array(cols).fill(null));
    for (let r = 0; r < DR_ROWS; r++) for (let c = 0; c < cols; c++) g[r][c] = large[r]?.[c + off] ?? null;
    return { grid: g, offset: off };
  };

  const { grid: beG, offset: beOff } = useMemo(() => extractWin(beL, DR_COLS), [beL]);
  const { grid: srG, offset: srOff } = useMemo(() => extractWin(srL, DR_COLS), [srL]);
  const { grid: crG, offset: crOff } = useMemo(() => extractWin(crL, DR_COLS), [crL]);

  const mkPred = (full: ('red' | 'blue' | null)[][], real: ('red' | 'blue' | null)[][], off: number, cols: number) => {
    if (predictedCount === 0) return undefined;
    const s = new Set<string>();
    for (let r = 0; r < DR_ROWS; r++) for (let c = 0; c < LARGE_COLS; c++) {
      if (full[r]?.[c] && !real[r]?.[c]) { const wc = c - off; if (wc >= 0 && wc < cols) s.add(`${r}-${wc}`); }
    }
    return s.size > 0 ? s : undefined;
  };
  const bePred = useMemo(() => mkPred(beL, rBeL, beOff, DR_COLS), [beL, rBeL, beOff, predictedCount]);
  const srPred = useMemo(() => mkPred(srL, rSrL, srOff, DR_COLS), [srL, rSrL, srOff, predictedCount]);
  const crPred = useMemo(() => mkPred(crL, rCrL, crOff, DR_COLS), [crL, rCrL, crOff, predictedCount]);

  // Stats
  const stats = useMemo(() => {
    const h = predictedCount > 0 ? roadHistory.slice(0, -predictedCount) : roadHistory;
    let b = 0, p = 0, t = 0;
    for (const e of h) { if (e.result === 'banker') b++; else if (e.result === 'player') p++; else if (e.result === 'tie') t++; }
    return { banker: b, player: p, tie: t, total: h.length };
  }, [roadHistory, predictedCount]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: LINE }}>
      {containerWidth > 0 && (
        <>
          {/* Row 1: 珠盤路(6×6) + 大路(14×6) */}
          <div className="flex" style={{ flex: '6', borderBottom: `2px solid ${SEPARATOR}` }}>
            <div className="h-full shrink-0" style={{ width: `${(BEAD_COLS / (BEAD_COLS + BR_COLS)) * 100}%`, borderRight: `2px solid ${SEPARATOR}` }}>
              <BeadRoad grid={beadRoadGrid} rows={BEAD_ROWS} cols={BEAD_COLS} totalEntries={roadHistory.length} predictedCount={predictedCount} />
            </div>
            <div className="h-full flex-1">
              <BigRoad grid={bigRoadGrid} rows={BR_ROWS} cols={BR_COLS} predictedCells={brPredCells} />
            </div>
          </div>

          {/* Row 2: 大眼路(10×6) + 小路(10×6) + 蟑螂路(10×6) — each 2×2 mini = 3 visual rows */}
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

          {/* Row 3: Stats bar */}
          <div className="shrink-0 flex items-center justify-between px-2" style={{ height: 20, backgroundColor: CELL_BG, fontSize: '9px', fontWeight: 'bold' }}>
            <div className="flex items-center gap-2">
              <span style={{ color: '#DC2626' }}>莊 <span className="text-gray-800">{stats.banker}</span></span>
              <span style={{ color: '#2563EB' }}>閒 <span className="text-gray-800">{stats.player}</span></span>
              <span style={{ color: '#16A34A' }}>和 <span className="text-gray-800">{stats.tie}</span></span>
              <span className="text-gray-500">總 <span className="text-gray-800">{stats.total}</span></span>
            </div>
            {onToggleAskRoad && (
              <div className="flex items-center gap-2">
                <button onClick={() => onToggleAskRoad('player')} className={`flex items-center ${askRoadMode === 'player' ? 'underline' : ''}`} style={{ color: '#2563EB' }}>
                  閒問路{playerAskPrediction && <PredictionDots {...playerAskPrediction} />}
                </button>
                <button onClick={() => onToggleAskRoad('banker')} className={`flex items-center ${askRoadMode === 'banker' ? 'underline' : ''}`} style={{ color: '#DC2626' }}>
                  莊問路{bankerAskPrediction && <PredictionDots {...bankerAskPrediction} />}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LobbyRoadmap);
