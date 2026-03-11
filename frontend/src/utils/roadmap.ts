// Shared roadmap algorithms for Baccarat road rendering
// Used by: Roadmap.tsx, RoadmapModal.tsx, LobbyRoadmap.tsx

export interface BigRoadCell {
  result: 'player' | 'banker';
  tieCount: number;
  playerPair?: boolean;
  bankerPair?: boolean;
}

export interface RoadHistoryEntry {
  roundNumber?: string;
  result: 'player' | 'banker' | 'tie';
  playerPair: boolean;
  bankerPair: boolean;
}

// Build Big Road column structure from data
// Each column represents consecutive wins of the same result
export function buildBigRoadColumns(data: RoadHistoryEntry[]): BigRoadCell[][] {
  const columns: BigRoadCell[][] = [];
  let currentCol: BigRoadCell[] = [];
  let lastResult: 'player' | 'banker' | null = null;

  for (const round of data) {
    if (round.result === 'tie') {
      // Tie adds to the last cell's tie count
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
      // New column starts when result changes
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
      // Same result continues in current column
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

// Build Big Road grid from columns with Dragon Tail handling
// Dragon Tail: when column exceeds max rows, extend horizontally
export function buildBigRoadGrid(columns: BigRoadCell[][], rows: number, maxCols: number): (BigRoadCell | null)[][] {
  const grid: (BigRoadCell | null)[][] = Array(rows).fill(null).map(() => Array(maxCols).fill(null));

  let gridCol = 0;

  for (const column of columns) {
    let row = 0;
    let col = gridCol;

    for (const cell of column) {
      // Check if we need to handle dragon tail (column overflow)
      if (row >= rows) {
        // Dragon tail: move right and stay at bottom row
        col++;
        row = rows - 1;
      }

      // Check if position is occupied (from previous dragon tail)
      while (col < maxCols && grid[row][col] !== null) {
        col++;
      }

      if (col < maxCols) {
        grid[row][col] = cell;
      }
      row++;
    }

    // Move to next column for next sequence
    gridCol = col + 1;
  }

  return grid;
}

// Build derived road (Big Eye Boy, Small Road, Cockroach Pig)
// offset: 1 for Big Eye Boy, 2 for Small Road, 3 for Cockroach Pig
//
// Rules:
// - Big Eye Boy starts at Big Road column 2, row 2 (or column 3, row 1 if column 2 has only 1 entry)
// - Small Road starts at Big Road column 3, row 2 (or column 4, row 1 if column 3 has only 1 entry)
// - Cockroach Pig starts at Big Road column 4, row 2 (or column 5, row 1 if column 4 has only 1 entry)
//
// Color determination:
// - When starting new column (row 0): Compare previous column length with column (offset+1) positions back
//   - Same length = RED (pattern), Different length = BLUE (chaos)
// - When continuing column (row > 0): Check if comparison column has entry at same depth
//   - "齊整" (both have or both don't have) = RED
//   - "不齊" (one has, one doesn't) = BLUE
//
// Layout: Same as Big Road - same color goes down, different color starts new column
// Dragon tail when exceeding maxRows or hitting occupied cell
export function buildDerivedRoad(
  columns: BigRoadCell[][],
  offset: number,
  maxRows: number = 6,
  maxCols: number = 20
): ('red' | 'blue' | null)[][] {
  const grid: ('red' | 'blue' | null)[][] = Array(maxRows).fill(null).map(() => Array(maxCols).fill(null));

  // Minimum columns needed to start
  // Big Eye Boy (offset=1): needs at least 2 columns, starts at column 2
  // Small Road (offset=2): needs at least 3 columns, starts at column 3
  // Cockroach Pig (offset=3): needs at least 4 columns, starts at column 4
  const startCol = offset + 1;
  if (columns.length < startCol) return grid;

  // First collect all the color results
  const colorResults: ('red' | 'blue')[] = [];

  // Iterate through each Big Road column starting from startCol
  for (let colIdx = startCol - 1; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;

    for (let entryIdx = 0; entryIdx < currColLen; entryIdx++) {
      // Skip the first entry of the starting column if it's the very first
      // Big Eye Boy starts from column 2, row 2 (entryIdx=1) OR column 3, row 1 if column 2 has 1 entry
      if (colIdx === startCol - 1) {
        // For starting column, skip first entry unless we're at column offset+2 (3 for Big Eye)
        if (entryIdx === 0) {
          // Can only start from row 2 (entryIdx=1) of starting column
          // OR if starting column has only 1 entry, we wait for next column
          continue;
        }
      }

      let color: 'red' | 'blue';

      if (entryIdx === 0) {
        // New column in Big Road - compare lengths
        // Compare column (colIdx-1) with column (colIdx-1-offset)
        const prevColLen = columns[colIdx - 1].length;
        const refColIdx = colIdx - 1 - offset;
        const refColLen = refColIdx >= 0 ? columns[refColIdx].length : 0;
        color = prevColLen === refColLen ? 'red' : 'blue';
      } else {
        // Continuing in same column - check "齊整" vs "不齊"
        // Compare with column (colIdx - offset) at depth (entryIdx - 1)
        const compareColIdx = colIdx - offset;
        const compareColLen = compareColIdx >= 0 ? columns[compareColIdx].length : 0;

        // If compare column length >= entryIdx, it has an entry at depth (entryIdx-1)
        // Current column at depth entryIdx means we have entries at depths 0 to entryIdx
        // We compare if both have entry at depth entryIdx (current row)
        // "齊整": compare column also has at least entryIdx entries → RED
        // "不齊": compare column has exactly entryIdx entries (just ran out) → BLUE
        color = compareColLen > entryIdx ? 'red' : (compareColLen === entryIdx ? 'blue' : 'red');
      }

      colorResults.push(color);
    }
  }

  // Now place colors in grid using Big Road layout logic
  // Same color goes down, different color starts new column
  // Dragon tail when exceeding rows or hitting occupied cell
  let gridCol = 0;

  // Group consecutive same colors into columns
  const derivedColumns: ('red' | 'blue')[][] = [];
  let currentDerivedCol: ('red' | 'blue')[] = [];
  let lastColor: 'red' | 'blue' | null = null;

  for (const color of colorResults) {
    if (lastColor !== null && color !== lastColor) {
      // Color changed - start new column
      if (currentDerivedCol.length > 0) {
        derivedColumns.push(currentDerivedCol);
      }
      currentDerivedCol = [color];
    } else {
      // Same color or first entry - continue in current column
      currentDerivedCol.push(color);
    }
    lastColor = color;
  }
  if (currentDerivedCol.length > 0) {
    derivedColumns.push(currentDerivedCol);
  }

  // Place columns in grid with dragon tail handling
  for (const column of derivedColumns) {
    let row = 0;
    let col = gridCol;

    for (const color of column) {
      // Check if we need dragon tail (row overflow)
      if (row >= maxRows) {
        col++;
        row = maxRows - 1;
      }

      // Check if position is occupied (from previous dragon tail)
      while (col < maxCols && grid[row][col] !== null) {
        col++;
      }

      if (col < maxCols) {
        grid[row][col] = color;
      }
      row++;
    }

    // Move to next column for next sequence
    gridCol = col + 1;
  }

  return grid;
}

// Build derived road as flat array (used by RoadmapModal)
export function buildDerivedRoadFlat(columns: BigRoadCell[][], offset: number): ('red' | 'blue')[] {
  const startCol = offset + 1;
  if (columns.length < startCol) return [];

  const results: ('red' | 'blue')[] = [];

  for (let colIdx = startCol - 1; colIdx < columns.length; colIdx++) {
    const currColLen = columns[colIdx].length;

    for (let entryIdx = 0; entryIdx < currColLen; entryIdx++) {
      if (colIdx === startCol - 1 && entryIdx === 0) {
        continue;
      }

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
