// Shared roadmap algorithms for Baccarat road rendering
// Used by: Roadmap.tsx, RoadmapModal.tsx, LobbyRoadmap.tsx

export interface BigRoadCell {
  result: 'player' | 'banker';
  tieCount: number;
  playerPair?: boolean;
  bankerPair?: boolean;
}

export interface RoadHistoryEntry {
  roundNumber?: number;
  result: 'player' | 'banker' | 'tie';
  playerPair: boolean;
  bankerPair: boolean;
}

// Build Big Road column structure from data
export function buildBigRoadColumns(data: RoadHistoryEntry[]): BigRoadCell[][] {
  const columns: BigRoadCell[][] = [];
  let currentCol: BigRoadCell[] = [];
  let lastResult: 'player' | 'banker' | null = null;

  for (const round of data) {
    if (round.result === 'tie') {
      if (currentCol.length > 0) {
        currentCol[currentCol.length - 1].tieCount++;
      } else if (columns.length > 0) {
        const prevCol = columns[columns.length - 1];
        prevCol[prevCol.length - 1].tieCount++;
      }
      continue;
    }

    const result = round.result as 'player' | 'banker';

    if (lastResult === null || result !== lastResult) {
      if (currentCol.length > 0) {
        columns.push(currentCol);
      }
      currentCol = [{
        result,
        tieCount: 0,
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
      }];
      lastResult = result;
    } else {
      currentCol.push({
        result,
        tieCount: 0,
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
      });
    }
  }

  if (currentCol.length > 0) {
    columns.push(currentCol);
  }

  return columns;
}

// Build Big Road grid from columns (with dragon tail)
export function buildBigRoadGrid(columns: BigRoadCell[][], rows: number, maxCols: number): (BigRoadCell | null)[][] {
  const grid: (BigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));

  let gridCol = 0;

  for (const column of columns) {
    let row = 0;
    for (const cell of column) {
      if (row >= rows) {
        row = rows - 1;
        gridCol++;
      }
      if (gridCol < maxCols) {
        grid[row][gridCol] = cell;
      }
      row++;
    }
    gridCol++;
  }

  return grid;
}

// Build derived road using Big Road column structure analysis (2D grid)
// Derived road rules (Big Eye Boy offset=1, Small Road offset=2, Cockroach Pig offset=3):
//   New column (i=0): compare columns[colIdx-1].length vs columns[colIdx-1-offset].length
//     Same depth → red (pattern), different → blue (chaos)
//   Continuing (i>0): at depth i in compare column (colIdx-offset):
//     Both (i) and (i-1) same status (both exist or both empty) → red
//     Different → blue. Equivalently: compareColLen === i → blue, else → red
export function buildDerivedRoad(columns: BigRoadCell[][], offset: number, maxRows: number = 6, maxCols: number = 20): ('red' | 'blue' | null)[][] {
  const grid: ('red' | 'blue' | null)[][] = Array(maxRows).fill(null).map(() => Array(maxCols).fill(null));

  if (columns.length < offset + 1) return grid;

  let outputCol = 0;
  let outputRow = 0;
  let lastColor: 'red' | 'blue' | null = null;

  for (let colIdx = offset; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;
    const compareColLen = columns[colIdx - offset].length;

    for (let i = 0; i < currColLen; i++) {
      if (colIdx === offset && i === 0) continue;

      let color: 'red' | 'blue';
      if (i === 0) {
        // New column: compare previous column depth with the column (offset) before it
        const prevColLen = columns[colIdx - 1].length;
        const refColIdx = colIdx - 1 - offset;
        const refColLen = refColIdx >= 0 ? columns[refColIdx].length : 0;
        color = prevColLen === refColLen ? 'red' : 'blue';
      } else {
        // Continuing: check cells at depth i and i-1 in the compare column
        // Both exist or both absent → red (pattern); one exists one absent → blue
        color = compareColLen === i ? 'blue' : 'red';
      }

      if (lastColor !== null && color !== lastColor) {
        outputCol++;
        outputRow = 0;
      } else if (lastColor !== null) {
        outputRow++;
        if (outputRow >= maxRows) {
          outputRow = maxRows - 1;
          outputCol++;
        }
      }

      if (outputCol < maxCols && outputRow < maxRows) {
        grid[outputRow][outputCol] = color;
        lastColor = color;
      }
    }
  }

  return grid;
}

// Build derived road as flat array (used by RoadmapModal)
export function buildDerivedRoadFlat(columns: BigRoadCell[][], offset: number): ('red' | 'blue')[] {
  if (columns.length < offset + 1) return [];
  const results: ('red' | 'blue')[] = [];
  for (let colIdx = offset; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;
    const compareColLen = columns[colIdx - offset].length;
    for (let i = 0; i < currColLen; i++) {
      if (colIdx === offset && i === 0) continue;
      let color: 'red' | 'blue';
      if (i === 0) {
        const prevColLen = columns[colIdx - 1].length;
        const refColIdx = colIdx - 1 - offset;
        const refColLen = refColIdx >= 0 ? columns[refColIdx].length : 0;
        color = prevColLen === refColLen ? 'red' : 'blue';
      } else {
        color = compareColLen === i ? 'blue' : 'red';
      }
      results.push(color);
    }
  }
  return results;
}

// Build bead road 2D grid (top-to-bottom, left-to-right)
export function buildBeadRoadGrid<T extends RoadHistoryEntry>(data: T[], rows: number): (T | null)[][] {
  const cols = Math.max(Math.ceil(data.length / rows), 1);
  const grid: (T | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

  data.forEach((round, index) => {
    const col = Math.floor(index / rows);
    const row = index % rows;
    if (col < cols) {
      grid[row][col] = round;
    }
  });

  return grid;
}
