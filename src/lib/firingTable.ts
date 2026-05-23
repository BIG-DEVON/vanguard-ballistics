/**
 * PROJECT VANGUARD - MULTI-WEAPON FIRING TABLE DATABASE
 */

export interface FiringSolution {
  type: string;
  elevation: number;
  charge: number;
}

export interface FiringTableRow {
  rangeMin: number;
  rangeMax: number;
  solutions: FiringSolution[];
}

// Database structured by Weapon System
export const WEAPON_DATABASES: Record<string, FiringTableRow[]> = {
  "60mm_Light": [
    { rangeMin: 1500, rangeMax: 1599, solutions: [{ type: "Main", elevation: 1100, charge: 3 }, { type: "High Angle", elevation: 1250, charge: 4 }] },
    { rangeMin: 1600, rangeMax: 1699, solutions: [{ type: "Main", elevation: 1080, charge: 3 }, { type: "High Angle", elevation: 1210, charge: 4 }] },
  ],
  "81mm_Medium": [
    { rangeMin: 1500, rangeMax: 1599, solutions: [{ type: "Main", elevation: 1020, charge: 2 }, { type: "Alt 1", elevation: 1220, charge: 3 }, { type: "Alt 2", elevation: 1338, charge: 4 }] },
    { rangeMin: 1600, rangeMax: 1699, solutions: [{ type: "Main", elevation: 1010, charge: 2 }, { type: "Alt 1", elevation: 1215, charge: 3 }, { type: "Alt 2", elevation: 1330, charge: 4 }] },
    { rangeMin: 1700, rangeMax: 1799, solutions: [{ type: "Main", elevation: 1000, charge: 2 }, { type: "Alt 1", elevation: 1200, charge: 3 }] },
  ],
  "120mm_Heavy": [
    { rangeMin: 1500, rangeMax: 1599, solutions: [{ type: "Main", elevation: 950, charge: 1 }, { type: "Alt 1", elevation: 1150, charge: 2 }] },
    { rangeMin: 1600, rangeMax: 1699, solutions: [{ type: "Main", elevation: 940, charge: 1 }, { type: "Alt 1", elevation: 1140, charge: 2 }] },
    { rangeMin: 20000, rangeMax: 21000, solutions: [{ type: "Main", elevation: 800, charge: 6 }] }, // Added extreme range for 120mm
  ],
};

export const getFiringSolutions = (weaponType: string, range: number): FiringSolution[] | null => {
  const db = WEAPON_DATABASES[weaponType];
  if (!db) return null;
  const row = db.find((r) => range >= r.rangeMin && range <= r.rangeMax);
  return row ? row.solutions : null;
};