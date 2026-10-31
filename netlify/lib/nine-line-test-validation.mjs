import { sharedModels } from './nine-line-test-models.mjs';
const ratings = ['unreviewed','clear','partial','unclear'];
export function validate(payload) {
 if(!payload || typeof payload!=='object' || Array.isArray(payload) || Object.keys(payload).sort().join(',')!=='consent,model,results') return false;
 if(payload.consent!==true || !sharedModels.includes(payload.model) || !Array.isArray(payload.results) || !payload.results.length || payload.results.length>30)return false;
 const distances=new Set();
 for(const r of payload.results){
  if(!r || typeof r!=='object' || Array.isArray(r) || Object.keys(r).sort().join(',')!=='clipping,distance,peak,rating,rms')return false;
  if(!Number.isInteger(r.distance)||r.distance<1||r.distance>30||distances.has(r.distance))return false;distances.add(r.distance);
  if(!ratings.includes(r.rating)||![r.rms,r.peak,r.clipping].every(Number.isFinite)||r.rms< -100||r.rms>0||r.peak< -100||r.peak>0||r.rms>r.peak||r.clipping<0||r.clipping>100)return false;
 }return true;
}

