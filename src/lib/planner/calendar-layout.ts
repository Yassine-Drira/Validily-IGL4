import type { CalendarTimeblock } from "@/types/database";

export interface ColumnLayout {
  colIndex: number;
  totalCols: number;
}

function parseTimeToMinutes(timeStr: string, isEnd = false): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (isEnd && h === 0 && m === 0) {
    return 24 * 60; // 1440 minutes = midnight
  }
  return (h || 0) * 60 + (m || 0);
}

/**
 * Computes overlap clustering and column placement for day timeblocks.
 * Guarantees that contiguous/consecutive blocks (e.g. 1pm-2pm, 2pm-3pm) do NOT cluster
 * into multi-column splits, while simultaneously allowing concurrent blocks to display side-by-side.
 */
export function computeTimeblockDayLayout(
  blocks: CalendarTimeblock[]
): Map<string, ColumnLayout> {
  const result = new Map<string, ColumnLayout>();
  if (blocks.length === 0) return result;

  // Sort by start time ascending, then duration descending
  const sorted = [...blocks].sort((a, b) => {
    const startA = parseTimeToMinutes(a.start_time);
    const startB = parseTimeToMinutes(b.start_time);
    if (startA !== startB) return startA - startB;
    return (b.duration_minutes || 60) - (a.duration_minutes || 60);
  });

  // Group into overlapping clusters
  const clusters: CalendarTimeblock[][] = [];
  let currentCluster: CalendarTimeblock[] = [];
  let clusterEnd = -1;

  for (const block of sorted) {
    const start = parseTimeToMinutes(block.start_time);
    const end = parseTimeToMinutes(block.end_time, true);

    if (currentCluster.length === 0) {
      currentCluster.push(block);
      clusterEnd = end;
    } else if (start < clusterEnd) {
      // Overlaps strictly with current cluster
      currentCluster.push(block);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      // Contiguous (start === clusterEnd) or later: completely independent cluster!
      clusters.push(currentCluster);
      currentCluster = [block];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const placements: { id: string; colIndex: number }[] = [];

    for (const block of cluster) {
      const start = parseTimeToMinutes(block.start_time);
      const end = parseTimeToMinutes(block.end_time, true);

      let placedCol = -1;
      for (let i = 0; i < columnEnds.length; i++) {
        if (columnEnds[i] <= start) {
          placedCol = i;
          columnEnds[i] = end;
          break;
        }
      }

      if (placedCol === -1) {
        placedCol = columnEnds.length;
        columnEnds.push(end);
      }

      placements.push({ id: block.id, colIndex: placedCol });
    }

    const totalCols = Math.max(1, columnEnds.length);
    for (const item of placements) {
      result.set(item.id, { colIndex: item.colIndex, totalCols });
    }
  }

  return result;
}
