import { QrError } from "./errors.js";
import {
  QR_FINDER_PATTERN_SIZE,
  QR_VERSION_DIMENSION_BASE,
  QR_VERSION_DIMENSION_STEP,
  QR_VERSION_MAX,
  QR_VERSION_MIN,
} from "./constants.js";
import type { QrFinderPattern } from "./types.js";

/** Finder separators extend one module beyond each 7 × 7 finder pattern. */
const FINDER_SEPARATOR_WIDTH = 1;

/** Alignment patterns are 5 × 5, centered on the version-specific grid. */
const ALIGNMENT_PATTERN_RADIUS = 2;

/** The timing row and column are placed at module coordinate 6. */
const TIMING_PATTERN_COORDINATE = 6;

/** Alignment centers are spaced on an even interval no greater than 28 modules. */
const ALIGNMENT_PATTERN_MAX_INTERVAL = 28;

/** Version information is present beginning with version 7. */
const VERSION_INFORMATION_MIN_VERSION = 7;

/** Version information occupies two 3 × 6 blocks and contains 18 bits each. */
const VERSION_INFORMATION_BLOCK_WIDTH = 3;
const VERSION_INFORMATION_BLOCK_HEIGHT = 6;
const VERSION_INFORMATION_BIT_COUNT =
  VERSION_INFORMATION_BLOCK_WIDTH * VERSION_INFORMATION_BLOCK_HEIGHT;

/** Format information uses coordinate 8 around each finder pattern. */
const FORMAT_INFORMATION_COORDINATE = 8;

/** Return the top-left coordinates of the three finder patterns. */
export function createQrFinderPatterns(size: number): readonly QrFinderPattern[] {
  const lastFinderStart = size - QR_FINDER_PATTERN_SIZE;

  return [
    { x: 0, y: 0 },
    { x: lastFinderStart, y: 0 },
    { x: 0, y: lastFinderStart },
  ];
}

/**
 * Mark every QR function or reserved cell without depending on encoder internals.
 * The ordering follows QR Model 2 placement: finders, alignment, timing, then
 * format/version information. This mask protects those cells from logos and
 * lets the renderer keep them square while styling data modules.
 */
export function createQrFunctionModules(version: number): boolean[][] {
  if (!Number.isInteger(version) || version < QR_VERSION_MIN || version > QR_VERSION_MAX) {
    throw new QrError("INVALID_VERSION", { minimum: QR_VERSION_MIN, maximum: QR_VERSION_MAX });
  }

  const size = version * QR_VERSION_DIMENSION_STEP + QR_VERSION_DIMENSION_BASE;
  const functionModules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const setFunctionModule = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < size && y < size) functionModules[y]![x] = true;
  };

  // Mark clipped 8 × 8 finder-and-separator regions in the three corners.
  const finderPatterns = createQrFinderPatterns(size);
  for (const { x: finderX, y: finderY } of finderPatterns) {
    for (
      let y = finderY - FINDER_SEPARATOR_WIDTH;
      y < finderY + QR_FINDER_PATTERN_SIZE + FINDER_SEPARATOR_WIDTH;
      y++
    ) {
      for (
        let x = finderX - FINDER_SEPARATOR_WIDTH;
        x < finderX + QR_FINDER_PATTERN_SIZE + FINDER_SEPARATOR_WIDTH;
        x++
      ) {
        setFunctionModule(x, y);
      }
    }
  }

  // Add the 5 × 5 alignment patterns, skipping centers already in a finder area.
  for (const centerY of getAlignmentPatternCenters(version, size)) {
    for (const centerX of getAlignmentPatternCenters(version, size)) {
      if (functionModules[centerY]![centerX]) continue;

      for (
        let y = centerY - ALIGNMENT_PATTERN_RADIUS;
        y <= centerY + ALIGNMENT_PATTERN_RADIUS;
        y++
      ) {
        for (
          let x = centerX - ALIGNMENT_PATTERN_RADIUS;
          x <= centerX + ALIGNMENT_PATTERN_RADIUS;
          x++
        ) {
          setFunctionModule(x, y);
        }
      }
    }
  }

  // Timing patterns fill only cells not already reserved by finder/alignment areas.
  for (let coordinate = 0; coordinate < size; coordinate++) {
    setFunctionModule(coordinate, TIMING_PATTERN_COORDINATE);
    setFunctionModule(TIMING_PATTERN_COORDINATE, coordinate);
  }

  // Reserve both copies of format information, including the fixed dark module.
  for (let offset = 0; offset < FORMAT_INFORMATION_COORDINATE + 1; offset++) {
    if (offset === TIMING_PATTERN_COORDINATE) continue;

    setFunctionModule(FORMAT_INFORMATION_COORDINATE, offset);
    setFunctionModule(offset, FORMAT_INFORMATION_COORDINATE);

    if (offset < FORMAT_INFORMATION_COORDINATE) {
      setFunctionModule(size - 1 - offset, FORMAT_INFORMATION_COORDINATE);
      setFunctionModule(FORMAT_INFORMATION_COORDINATE, size - 1 - offset);
    }
  }

  if (version >= VERSION_INFORMATION_MIN_VERSION) {
    for (let offset = 0; offset < VERSION_INFORMATION_BIT_COUNT; offset++) {
      const x = size - 11 + (offset % VERSION_INFORMATION_BLOCK_WIDTH);
      const y = Math.floor(offset / VERSION_INFORMATION_BLOCK_WIDTH);
      setFunctionModule(x, y);
      setFunctionModule(y, x);
    }
  }

  return functionModules;
}

function getAlignmentPatternCenters(version: number, size: number): number[] {
  if (version === QR_VERSION_MIN) return [];

  const lastCenter = size - QR_FINDER_PATTERN_SIZE;
  const intervalCount = Math.ceil(
    (lastCenter - TIMING_PATTERN_COORDINATE) / ALIGNMENT_PATTERN_MAX_INTERVAL,
  );
  let interval = Math.floor((lastCenter - TIMING_PATTERN_COORDINATE) / intervalCount);

  if (interval % 2 !== 0) {
    interval++;
  } else if (((lastCenter - TIMING_PATTERN_COORDINATE) % intervalCount) * 2 >= intervalCount) {
    interval += 2;
  }

  const centers = [TIMING_PATTERN_COORDINATE];
  for (let index = 1; index < intervalCount; index++) {
    centers.push(lastCenter - (intervalCount - index) * interval);
  }
  centers.push(lastCenter);

  return centers;
}
