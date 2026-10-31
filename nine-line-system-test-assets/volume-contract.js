import {sharedModels} from './models.js';
import {pickupMetrics,pickupScore} from './volume.js';
export const PUBLIC_MODELS=new Set(sharedModels.filter(m=>m!=='Test fixture / Synthetic'));
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys;
const finite=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi;
function raw(x,withDistance=false){
 if(!exact(x,withDistance?'clipped,count,distance,peak,sum':'clipped,count,peak,sum')||x.count>10000000)throw Error('Invalid measured audio levels.');
 pickupMetrics(x);
 return {sum:x.sum,count:x.count,peak:x.peak,clipped:x.clipped};
}
export function publicVolumePayload(payload){
 if(!exact(payload,'baseline,consentPublic,model,results,version')||payload.version!==3||payload.consentPublic!==true||!PUBLIC_MODELS.has(payload.model)||!Array.isArray(payload.results)||payload.results.length!==3)throw Error('Invalid public result.');
 const baseline=raw(payload.baseline),seen=new Set();
 const results=payload.results.map(r=>{const metrics=raw(r,true);if(![5,10,20].includes(r.distance)||seen.has(r.distance))throw Error('Invalid distances.');seen.add(r.distance);return {distance:r.distance,...metrics};}).sort((a,b)=>a.distance-b.distance);
 const score=pickupScore(baseline,results.map(r=>({distance:r.distance,levels:r}))).score;
 if(score===null)throw Error('Invalid score inputs.');
 return {version:3,consentPublic:true,model:payload.model,baseline,results};
}
export function payloadFromSamples(samples){
 const baseline=samples.find(s=>s.kind==='baseline');const speech=samples.filter(s=>s.kind==='speech');const note=baseline?.notes;
 if(!note||speech.some(s=>s.notes.make!==note.make||s.notes.model!==note.model||s.notes.manual!==note.manual))throw Error('Complete one device test before submitting.');
 return publicVolumePayload({version:3,consentPublic:true,model:note.make+' / '+note.model,baseline:baseline.captureMetrics,results:speech.map(s=>({distance:s.distance,...s.captureMetrics}))});
}
export function validateRoster(value){
 if(!exact(value,'rows,scorePolicyVersion,truncated,version')||value.version!==3||value.scorePolicyVersion!==1||![0,1].includes(value.truncated)||!Array.isArray(value.rows)||value.rows.length>100)return false;
 const seen=new Set();let last=null;
 for(const row of value.rows){
  if(!exact(row,'model,results,score,testCount')||!PUBLIC_MODELS.has(row.model)||seen.has(row.model)||!finite(row.score,1,10)||!Number.isInteger(row.testCount)||row.testCount<1||row.testCount>10000||!Array.isArray(row.results)||row.results.length!==3)return false;
  if(last&&(last.score<row.score||(last.score===row.score&&last.model>row.model)))return false;
  seen.add(row.model);last=row;
  for(let i=0;i<3;i++){const r=row.results[i];if(!exact(r,'comparableCount,distance,meanClipping,meanDeltaDb,meanPeakDb,meanRmsDb')||r.distance!==[5,10,20][i]||!finite(r.meanRmsDb,-100,0)||!finite(r.meanPeakDb,r.meanRmsDb-1e-8,0)||!finite(r.meanClipping,0,100)||!Number.isInteger(r.comparableCount)||r.comparableCount<0||r.comparableCount>row.testCount||(r.comparableCount===0?r.meanDeltaDb!==null:!finite(r.meanDeltaDb,-100,100)))return false;}
 }
 return true;
}
export function validatePublicReceipt(x){return exact(x,'message,score,version')&&x.message==='Result published publicly.'&&x.version===3&&finite(x.score,1,10);}
