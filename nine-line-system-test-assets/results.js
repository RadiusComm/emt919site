import { MODELS } from './models.js';
import { latestDistances } from './metrics.js';
export function sharedPayload(samples){
 const speech=latestDistances(samples);if(!speech.length)throw Error('Record at least one speech sample first.');
 const note=speech.at(-1).notes;
 if(!note.make||!note.model||!(note.make in MODELS))throw Error('Select your device make and model before recording.');
 if(speech.some(s=>s.notes.make!==note.make||s.notes.model!==note.model||s.notes.manual!==note.manual))throw Error('Use one device per session. Delete recordings before changing devices.');
 return {consent:true,model:note.make+' / '+note.model,results:speech.map(s=>({distance:s.distance,rms:s.rms,peak:s.peak,clipping:s.clipping,rating:s.listened?s.rating:'unreviewed'}))};
}
