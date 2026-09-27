import { LIKE_TIERS, SECTOR_COUNT } from '../types/news';

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function describeAnnularWedge(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  if (rOuter <= rInner + 0.05) return '';
  const os = polarToCartesian(cx, cy, rOuter, startDeg);
  const oe = polarToCartesian(cx, cy, rOuter, endDeg);
  let diff = endDeg - startDeg;
  if (diff < 0) diff += 360;
  const large = diff > 180 ? 1 : 0;
  const is = polarToCartesian(cx, cy, rInner, startDeg);
  const ie = polarToCartesian(cx, cy, rInner, endDeg);
  return `M ${os.x.toFixed(2)} ${os.y.toFixed(2)} A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 ${large} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)} L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)} A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 ${large} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)} Z`;
}

export function likesToTier(likes: number): number {
  for (let i = LIKE_TIERS.length - 1; i >= 0; i--) {
    if (likes >= LIKE_TIERS[i].min) return i;
  }
  return 0;
}

export interface RoseStats {
  total: number;
  visibleTotal: number;
  sectorTotals: number[];
  sectorPct: number[];
  tierTotals: number[];
  tierPct: number[];
  matrixPct: number[][];
  maxSectorPct: number;
  maxSectorCount: number;
  dominantSector: number;
  categoryTotals: number[];
  platformTotals: number[];
}

export function computeRoseStats(counts: number[][], visibleTiers: boolean[]): RoseStats {
  let total = 0;
  let visibleTotal = 0;
  const sectorTotals = new Array(SECTOR_COUNT).fill(0);
  const tierTotals = new Array(LIKE_TIERS.length).fill(0);
  const categoryTotals = new Array(6).fill(0);
  const platformTotals = new Array(3).fill(0);

  for (let s = 0; s < SECTOR_COUNT; s++) {
    for (let t = 0; t < LIKE_TIERS.length; t++) {
      const c = counts[s]?.[t] ?? 0;
      total += c;
      tierTotals[t] += c;
      if (visibleTiers[t]) {
        sectorTotals[s] += c;
        visibleTotal += c;
      }
    }
    categoryTotals[Math.floor(s / 3)] += sectorTotals[s];
    platformTotals[s % 3] += sectorTotals[s];
  }

  const d = Math.max(1, visibleTotal);
  const sectorPct = sectorTotals.map((c) => (c / d) * 100);
  const tierPct = tierTotals.map((c) => (c / Math.max(1, total)) * 100);
  const matrixPct = counts.map((row) =>
    row.map((c, t) => (visibleTiers[t] ? (c / d) * 100 : 0))
  );

  let dominantSector = 0;
  let maxSectorPct = 0;
  let maxSectorCount = 0;
  sectorPct.forEach((p, i) => {
    if (p > maxSectorPct) {
      maxSectorPct = p;
      dominantSector = i;
    }
    if (sectorTotals[i] > maxSectorCount) maxSectorCount = sectorTotals[i];
  });

  return {
    total,
    visibleTotal,
    sectorTotals,
    sectorPct,
    tierTotals,
    tierPct,
    matrixPct,
    maxSectorPct,
    maxSectorCount,
    dominantSector,
    categoryTotals,
    platformTotals,
  };
}
