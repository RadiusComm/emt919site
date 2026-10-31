import { sharedModels } from './nine-line-test-models.mjs';

// Version 2 is a distinct automatic-estimate envelope, never a human clarity rating.
// Policy 1: pinned tiny.en ASR; WER <= .2 plus exactly one matching distance.
export const AUTO_SCHEMA_VERSION = 2;
export const AUTO_POLICY_VERSION = 1;
const distances = [2,6,10,15,20];
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys;
export function validateAutomatic(payload) {
  if (!exact(payload,'consent,model,results,version') || payload.version !== AUTO_SCHEMA_VERSION || payload.consent !== true || !sharedModels.includes(payload.model)) return false;
  if (!Array.isArray(payload.results) || payload.results.length < 1 || payload.results.length > 5) return false;
  const seen = new Set();
  for (const r of payload.results) {
    if (!exact(r,'automatic,clipping,distance,peak,rms') || !distances.includes(r.distance) || seen.has(r.distance)) return false;
    seen.add(r.distance);
    if (![r.rms,r.peak,r.clipping].every(Number.isFinite) || r.rms < -100 || r.peak > 0 || r.rms > r.peak || r.clipping < 0 || r.clipping > 100) return false;
    const a = r.automatic;
    if (!exact(a,'clippingWarning,distanceMatched,status,version,wer') || a.version !== AUTO_POLICY_VERSION || ![1,2,3].includes(a.status) || ![0,1].includes(a.distanceMatched) || a.clippingWarning !== Number(r.clipping >= 1)) return false;
    if (a.status === 3) { if (a.wer !== null || a.distanceMatched !== 0) return false; }
    else {
      if (!Number.isFinite(a.wer) || a.wer < 0 || a.wer > 10) return false;
      const recognized = a.wer <= .2 && a.distanceMatched === 1;
      if ((a.status === 1) !== recognized) return false;
    }
  }
  return true;
}

// Reconstruct, don't forward the visitor object. This is used after strict validation.
export function sanitizedAutomatic(payload) {
  if (!validateAutomatic(payload)) throw new TypeError('Invalid automatic result.');
  return { consent:true, model:payload.model, version:AUTO_SCHEMA_VERSION, results:payload.results.map(r => ({
    distance:r.distance, rms:r.rms, peak:r.peak, clipping:r.clipping,
    automatic:{ version:AUTO_POLICY_VERSION, status:r.automatic.status, wer:r.automatic.wer, distanceMatched:r.automatic.distanceMatched, clippingWarning:r.automatic.clippingWarning }
  })) };
}
