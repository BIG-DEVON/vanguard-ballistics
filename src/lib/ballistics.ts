/**
 * PROJECT VANGUARD - BALLISTICS ENGINE (ULTIMATE EDITION)
 * Handles Military Grid conversions, Euclidean calculations, Fire Adjustments,
 * and Meteorological (MET) variable offsets.
 */

export interface GridCoordinates {
  easting: number;
  northing: number;
}

export interface MetData {
  windSpeed: number; // in knots
  windDirMils: number; // in mils (direction wind is blowing FROM)
  tempC: number; // in Celsius
}

export interface FiringData {
  range: number;
  bearingMils: number;
  isValid: boolean;
}

/**
 * Normalizes a 4, 6, 8, or 10-digit grid string into 1-meter precision coordinates.
 */
export const parseGrid = (grid: string): GridCoordinates | null => {
  const cleanGrid = grid.replace(/\s/g, "");
  const len = cleanGrid.length;

  if (len < 4 || len % 2 !== 0) return null;

  const half = len / 2;
  const rawE = cleanGrid.substring(0, half);
  const rawN = cleanGrid.substring(half);

  const multiplier = Math.pow(10, 5 - half);

  return {
    easting: parseInt(rawE) * multiplier,
    northing: parseInt(rawN) * multiplier,
  };
};

/**
 * Converts internal 1-meter precision coordinates back to a tactical 6-digit grid string.
 */
export const formatTo6DigitGrid = (coords: GridCoordinates): string => {
  // Convert back to 100m precision, absolute values to prevent negative grid errors
  let eStr = Math.round(Math.abs(coords.easting) / 100).toString().padStart(3, '0');
  let nStr = Math.round(Math.abs(coords.northing) / 100).toString().padStart(3, '0');
  
  // Ensure strict 6-digit format by slicing the last 3 digits (standard 100km square looping)
  eStr = eStr.slice(-3);
  nStr = nStr.slice(-3);
  
  return `${eStr}${nStr}`;
};

/**
 * Calculates Range and Bearing (Mils), applying Meteorological offsets if provided.
 */
export const calculateFire = (gun: string, target: string, metData?: MetData): FiringData | null => {
  const p1 = parseGrid(gun);
  const p2 = parseGrid(target);

  if (!p1 || !p2) return null;

  const dE = p2.easting - p1.easting;
  const dN = p2.northing - p1.northing;

  // Edge Case: Gun and Target are on the exact same coordinate
  if (dE === 0 && dN === 0) {
    return { range: 0, bearingMils: 0, isValid: true };
  }

  // Base Geometric Math (Euclidean)
  let range = Math.sqrt(Math.pow(dE, 2) + Math.pow(dN, 2));

  let angleRad = Math.atan2(dE, dN);
  let degrees = (angleRad * 180) / Math.PI;
  if (degrees < 0) degrees += 360;
  let bearingMils = degrees * (6400 / 360);

  // Apply Advanced MET Data Offsets (if activated in UI)
  if (metData && (metData.windSpeed > 0 || metData.tempC !== 15)) {
    const targetAzRad = bearingMils * (Math.PI / 3200);
    const windAzRad = metData.windDirMils * (Math.PI / 3200);
    
    // Calculate relative wind angle (Headwind vs Crosswind relative to line of fire)
    const relAngle = windAzRad - targetAzRad;
    const headWind = metData.windSpeed * Math.cos(relAngle);
    const crossWind = metData.windSpeed * Math.sin(relAngle);
    
    // Ballistic physical approximations:
    // Headwinds drop the round early. Higher temps (less dense air) let the round fly further.
    range = range - (headWind * 1.5) + ((metData.tempC - 15) * 2.1);
    
    // Crosswinds push the bearing laterally
    bearingMils = bearingMils + (crossWind * 0.8);
    
    // Normalize final constraints
    if (range < 0) range = 0;
    if (bearingMils < 0) bearingMils += 6400;
    if (bearingMils >= 6400) bearingMils -= 6400;
  }

  return {
    range: parseFloat(range.toFixed(2)),
    bearingMils: parseFloat(bearingMils.toFixed(2)),
    isValid: true,
  };
};

/**
 * Applies physical fire corrections (Add/Drop/Left/Right) to a target grid.
 * Add/Drop moves along the gun-target line. Left/Right moves perpendicular.
 */
export const applyCorrection = (
  gunGrid: string, 
  targetGrid: string, 
  adjustment: { type: 'ADD' | 'DROP' | 'LEFT' | 'RIGHT', meters: number }
): string | null => {
  const p1 = parseGrid(gunGrid);
  const p2 = parseGrid(targetGrid);

  if (!p1 || !p2) return null;

  const dE = p2.easting - p1.easting;
  const dN = p2.northing - p1.northing;

  // Find the current angle in radians (Gun-Target Line)
  const angleRad = Math.atan2(dE, dN);

  let newE = p2.easting;
  let newN = p2.northing;

  // Trigonometric shifts
  switch (adjustment.type) {
    case 'ADD':
      newE += adjustment.meters * Math.sin(angleRad);
      newN += adjustment.meters * Math.cos(angleRad);
      break;
    case 'DROP':
      newE -= adjustment.meters * Math.sin(angleRad);
      newN -= adjustment.meters * Math.cos(angleRad);
      break;
    case 'RIGHT':
      // Shift +90 degrees (pi/2)
      newE += adjustment.meters * Math.sin(angleRad + Math.PI / 2);
      newN += adjustment.meters * Math.cos(angleRad + Math.PI / 2);
      break;
    case 'LEFT':
      // Shift -90 degrees (pi/2)
      newE += adjustment.meters * Math.sin(angleRad - Math.PI / 2);
      newN += adjustment.meters * Math.cos(angleRad - Math.PI / 2);
      break;
  }

  return formatTo6DigitGrid({ easting: newE, northing: newN });
};