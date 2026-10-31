// Digital microphone levels only: not calibrated sound pressure, SNR, or intelligibility.
export const DISPLAY_FLOOR_DB = -100;
const FLOOR_MEAN_SQUARE = 10 ** (DISPLAY_FLOOR_DB / 10);

function validated(run) {
  if (!run || typeof run !== 'object') throw new TypeError('Missing capture metrics');
  const { sum, count, peak, clipped } = run;
  if (!Number.isSafeInteger(count) || count <= 0 ||
      !Number.isFinite(sum) || sum < 0 || sum > count ||
      !Number.isFinite(peak) || peak < 0 || peak > 1 ||
      !Number.isSafeInteger(clipped) || clipped < 0 || clipped > count) {
    throw new RangeError('Invalid capture metrics');
  }
  const meanSquare = sum / count;
  // Permit floating-point accumulation tolerance, but reject contradictory metrics.
  if ((sum === 0) !== (peak === 0) || meanSquare > peak * peak + Number.EPSILON * 16 ||
      sum + Number.EPSILON * count * 16 < peak * peak ||
      sum + Number.EPSILON * count * 16 < clipped * .99 ** 2 ||
      (clipped > 0 && peak < .99) || (clipped === 0 && peak >= .99)) {
    throw new RangeError('Inconsistent capture metrics');
  }
  return { meanSquare, peak, clipping: clipped / count * 100 };
}

function baselineMeanSquare(baseline) {
  if (!baseline || typeof baseline !== 'object') throw new TypeError('Invalid baseline');
  if ('sum' in baseline || 'count' in baseline) return validated(baseline).meanSquare;
  const { meanSquare, rmsDb, peakDb, clipping } = baseline;
  const expectedRms = meanSquare > 0 ? Math.max(DISPLAY_FLOOR_DB, 10 * Math.log10(meanSquare)) : DISPLAY_FLOOR_DB;
  if (!Number.isFinite(meanSquare) || meanSquare < 0 || meanSquare > 1 ||
      !Number.isFinite(rmsDb) || rmsDb < DISPLAY_FLOOR_DB || rmsDb > 0 ||
      !Number.isFinite(peakDb) || peakDb < DISPLAY_FLOOR_DB || peakDb > 0 ||
      !Number.isFinite(clipping) || clipping < 0 || clipping > 100 ||
      Math.abs(rmsDb - expectedRms) > 1e-9 || rmsDb > peakDb + 1e-9 ||
      meanSquare + 1e-12 < clipping / 100 * .99 ** 2 ||
      (clipping > 0 && peakDb < 20 * Math.log10(.99) - 1e-9) ||
      (meanSquare === 0 && (peakDb !== DISPLAY_FLOOR_DB || clipping !== 0))) {
    throw new RangeError('Invalid baseline metrics');
  }
  return meanSquare;
}

export function pickupMetrics(run, baseline) {
  const { meanSquare, peak, clipping } = validated(run);
  const rmsDb = meanSquare > 0 ? Math.max(DISPLAY_FLOOR_DB, 10 * Math.log10(meanSquare)) : DISPLAY_FLOOR_DB;
  const peakDb = peak > 0 ? Math.max(DISPLAY_FLOOR_DB, 20 * Math.log10(peak)) : DISPLAY_FLOOR_DB;
  let deltaDb = null, deltaReason = 'no-baseline';
  if (baseline !== undefined && baseline !== null) {
    const baseMeanSquare = baselineMeanSquare(baseline);
    if (baseMeanSquare < FLOOR_MEAN_SQUARE) deltaReason = 'baseline-too-quiet';
    else if (meanSquare < FLOOR_MEAN_SQUARE) deltaReason = 'trial-too-quiet';
    else {
      deltaDb = 10 * (Math.log10(meanSquare) - Math.log10(baseMeanSquare));
      deltaReason = null;
    }
  }
  return { meanSquare, rmsDb, peakDb, clipping, deltaDb, deltaReason };
}

// Deliberately heuristic, not calibrated: total captured level relative to a separate
// room baseline is NOT speech-only SNR, intelligibility, or native-app compatibility.
// Weights emphasize distant pickup. The 30 dB ceiling and 5% clipping threshold
// are transparent scoring choices, not empirically validated operating thresholds.
export function pickupScore(baseline, trials) {
  const insufficient = reason => ({ score: null, reason });
  if (baseline === undefined || baseline === null) return insufficient('no-baseline');
  let basePower;
  try { basePower = baselineMeanSquare(baseline); }
  catch { return insufficient('invalid-baseline'); }
  let floorLimited = basePower <= FLOOR_MEAN_SQUARE;
  const scoreBasePower = Math.max(basePower, FLOOR_MEAN_SQUARE);
  const weights = new Map([[5, .2], [10, .3], [20, .5]]);
  if (!Array.isArray(trials) || trials.length !== 3) return insufficient('incomplete-trials');
  const seen = new Set();
  let weightedPickup = 0, weightedClipping = 0;
  for (const trial of trials) {
    if (!trial || !weights.has(trial.distance) || seen.has(trial.distance)) return insufficient('invalid-trials');
    seen.add(trial.distance);
    let power, clipping;
    try {
      power = baselineMeanSquare(trial.levels);
      clipping = ('sum' in trial.levels || 'count' in trial.levels) ? validated(trial.levels).clipping : trial.levels.clipping;
    } catch { return insufficient('invalid-trials'); }
    if (power <= FLOOR_MEAN_SQUARE) floorLimited = true;
    const weight = weights.get(trial.distance);
    // A valid silent trial contributes minimum pickup rather than missing data.
    // Floor-bound scoring is explicitly approximate; measured deltaDb stays null.
    const delta = 10 * (Math.log10(Math.max(power, FLOOR_MEAN_SQUARE)) - Math.log10(scoreBasePower));
    weightedPickup += weight * Math.max(0, Math.min(30, delta)) / 30;
    weightedClipping += weight * clipping;
  }
  const penalty = 2 * Math.min(1, weightedClipping / 5);
  const score = Math.round(Math.max(1, Math.min(10, 1 + 9 * weightedPickup - penalty)) * 10) / 10;
  return { score, reason: floorLimited ? 'floor-limited' : null };
}
