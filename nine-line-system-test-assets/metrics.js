export const PHRASE = 'The blue folder is beside the window. Please bring seven small boxes to the front desk.';
export const db = value => value > 0 ? Math.max(-100, 20 * Math.log10(value)) : -100;
export function frameMetrics(data) {
  let sum = 0, peak = 0, clipped = 0;
  for (const value of data) { const n = Math.abs(value); sum += value * value; peak = Math.max(peak, n); if (n >= .99) clipped++; }
  return { sum, peak, clipped, count: data.length, rms: data.length ? Math.sqrt(sum / data.length) : 0 };
}
export function latestDistances(samples) {
  const map = new Map();
  for (const s of samples) if (s.kind === 'speech') map.set(s.distance, s);
  return [...map.values()].sort((a,b) => a.distance - b.distance);
}
export function summary(samples) {
  const latest = latestDistances(samples), target = latest.find(s => s.distance === 6);
  const clear = latest.filter(s => !s.noSignal && s.rating === 'clear' && s.listened);
  return { farthest: clear.length ? Math.max(...clear.map(s => s.distance)) : null,
    target: !target ? 'Untested' : target.noSignal ? 'Not qualified' : !target.listened || target.rating === 'unreviewed' ? 'Needs review' : target.rating === 'clear' ? 'Clear · reviewed' : 'Not qualified' };
}
export function validDistance(n) { return Number.isInteger(n) && n >= 1 && n <= 30; }
