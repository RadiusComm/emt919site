import {sharedModels} from './models.js';
export const RECOGNITION_SCHEMA_VERSION=4;
export const RECOGNITION_POLICY_VERSION=2;
export const RECOGNITION_REFERENCE_WORDS=16;
export const RECOGNITION_DISTANCES=[5,10,20];
export const RECOGNITION_PUBLIC_MODELS=new Set(sharedModels.filter(m=>m!=='Test fixture / Synthetic'));
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys;
const finite=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi;
const integer=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const round=n=>Math.round(n*10)/10;
export function recognitionTrial(r){
 if(!exact(r,'deletions,distance,distanceMatched,insertions,protocolMismatch,referenceWords,status,substitutions')||!RECOGNITION_DISTANCES.includes(r.distance)||r.status!==1||r.protocolMismatch!==0||r.referenceWords!==16||![0,1].includes(r.distanceMatched)||!integer(r.substitutions,0,16)||!integer(r.deletions,0,16)||r.substitutions+r.deletions>16||!integer(r.insertions,0,160))throw Error('Complete valid recognition trials are required.');
 const wer=(r.substitutions+r.deletions+r.insertions)/16;
 return {wer,score:1+9*Math.max(0,1-wer)};
}
// No text, waveforms, amplitude, caller scores, identities or runtime options accepted.
export function publicRecognitionPayload(p,{allowSynthetic=false}={}){
 if(!exact(p,'consentPublic,model,results,scorePolicyVersion,version')||p.version!==4||p.scorePolicyVersion!==2||p.consentPublic!==true||!(RECOGNITION_PUBLIC_MODELS.has(p.model)||(allowSynthetic&&p.model==='Test fixture / Synthetic'))||!Array.isArray(p.results)||p.results.length!==3)throw Error('Invalid public recognition result.');
 const seen=new Set();const results=p.results.map(r=>{recognitionTrial(r);if(seen.has(r.distance))throw Error('Duplicate distance.');seen.add(r.distance);return {distance:r.distance,status:1,substitutions:r.substitutions,deletions:r.deletions,insertions:r.insertions,referenceWords:16,distanceMatched:r.distanceMatched,protocolMismatch:0};}).sort((a,b)=>a.distance-b.distance);
 return{version:4,scorePolicyVersion:2,consentPublic:true,model:p.model,results};
}
export function recognitionScore(results){
 if(!Array.isArray(results)||results.length!==3||new Set(results.map(r=>r.distance)).size!==3)throw Error('All three trials are required.');
 const trials=results.map(r=>({distance:r.distance,...recognitionTrial(r)}));
 const rawScore=trials.reduce((sum,r)=>sum+r.score,0)/3;
 return {rawScore,score:round(rawScore),trials};
}
export function recognitionPayloadFromSamples(samples){
 const speech=samples.filter(s=>s.kind==='speech'),note=speech[0]?.notes;
 if(!note||speech.some(s=>s.notes.make!==note.make||s.notes.model!==note.model||s.notes.manual!==note.manual))throw Error('Complete one device test before submitting.');
 return publicRecognitionPayload({version:4,scorePolicyVersion:2,consentPublic:true,model:note.make+' / '+note.model,results:speech.map(s=>{
  const a=s.automatic;if(!a||a.version!==2||![1,2].includes(a.status)||a.protocolMismatch!==0)throw Error('Finish or retry every recognition trial first.');
  return {distance:s.distance,status:1,substitutions:a.substitutions,deletions:a.deletions,insertions:a.insertions,referenceWords:a.referenceWords,distanceMatched:a.distanceMatched,protocolMismatch:0};
 })});
}
export function validateRecognitionReceipt(x){return exact(x,'message,score,scorePolicyVersion,version')&&x.message==='Recognition result published publicly.'&&x.version===4&&x.scorePolicyVersion===2&&finite(x.score,1,10);}
export function validateRecognitionRoster(x){
 if(!exact(x,'rows,scorePolicyVersion,truncated,version')||x.version!==4||x.scorePolicyVersion!==2||![0,1].includes(x.truncated)||!Array.isArray(x.rows)||x.rows.length>100)return false;
 const seen=new Set();let last;
 for(const r of x.rows){
  if(!exact(r,'model,results,score,testCount')||!RECOGNITION_PUBLIC_MODELS.has(r.model)||seen.has(r.model)||!finite(r.score,1,10)||!integer(r.testCount,1,10000)||!Array.isArray(r.results)||r.results.length!==3)return false;
  if(last&&(last.score<r.score||(last.score===r.score&&last.model>r.model)))return false;last=r;seen.add(r.model);
  for(let i=0;i<3;i++){const t=r.results[i];if(!exact(t,'distance,distanceMatchedCount,meanScore,meanWer')||t.distance!==RECOGNITION_DISTANCES[i]||!integer(t.distanceMatchedCount,0,r.testCount)||!finite(t.meanWer,0,11)||!finite(t.meanScore,1,10))return false;}
 }return true;
}
