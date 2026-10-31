import { MODELS } from './models.js';
import { latestDistances, summary } from './metrics.js';
const key='covert-mode-summary-history-v1';
export function summaryRecord(samples) {
 const speech=latestDistances(samples);if(!speech.length)throw Error('Record at least one speech sample first.');
 const note=speech.at(-1).notes;
 if(speech.some(s=>s.notes.make!==note.make || s.notes.model!==note.model || s.notes.manual!==note.manual))throw Error('Use one device per session. Delete samples before changing devices.');
 return {saved:new Date().toISOString(),device:note.make+' / '+(note.model==='Other'?note.manual||'Other':note.model),os:note.os,version:note.version,summary:summary(samples),results:speech.map(s=>({distance:s.distance,rms:s.rms,peak:s.peak,clipping:s.clipping,rating:s.listened?s.rating:'unreviewed'}))};
}
export function sharedPayload(samples){const record=summaryRecord(samples), note=latestDistances(samples).at(-1).notes;
 if(!note.make||!note.model||!(note.make in MODELS))throw Error('Select your device make and model before recording.');
 return {consent:true,model:note.make+' / '+note.model,results:record.results};
}
export function loadHistory(storage=localStorage){try{const data=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(data)?data.filter(x=>typeof x.device==='string' && x.summary && Array.isArray(x.results)).slice(-50):[];}catch{return [];}}
export function saveHistory(record,storage=localStorage){const list=[...loadHistory(storage),record].slice(-50);storage.setItem(key,JSON.stringify(list));return list;}
export function deleteHistory(storage=localStorage){storage.removeItem(key);}
