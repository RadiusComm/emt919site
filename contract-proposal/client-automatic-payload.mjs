// Integrate only after the reviewed upstream + proxy v2 rollout is confirmed.
// This pure serializer has no network or persistence access.
import { sharedPayload } from '../nine-line-system-test-assets/results.js';
import { sanitizedAutomatic } from '../netlify/lib/nine-line-auto-validation.mjs';
export const AUTOMATIC_SUBMISSION_ENABLED = false;
export function automaticPayload(samples) {
  const manual = sharedPayload(samples); // Existing one-device/catalog validation.
  const required = [2,6,10,15,20];
  const latest = new Map();
  for (const sample of samples) if (sample.kind === 'speech') latest.set(sample.distance, sample);
  if (required.some(distance => !latest.has(distance))) throw new Error('Complete all five speech trials first.');
  return sanitizedAutomatic({consent:true, model:manual.model, version:2, results:required.map(distance => {
    const s = latest.get(distance);
    if (!s.automatic) throw new Error('Analyze every speech trial before automatic submission.');
    return {distance, rms:s.rms, peak:s.peak, clipping:s.clipping, automatic:{version:s.automatic.version,status:s.automatic.status,wer:s.automatic.wer,distanceMatched:s.automatic.distanceMatched,clippingWarning:s.automatic.clippingWarning}};
  })});
}
