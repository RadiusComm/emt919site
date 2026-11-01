import {payloadFromSamples,validateRoster,validatePublicReceipt} from './volume-contract.js';
// Enable only after the additive upstream deployment is verified and rollout approved.
export const PUBLIC_ROSTER_ENABLED=true;
const base='/api/nine-line-system-test/';
async function json(response,limit){const reader=response.body?.getReader();if(!reader)throw Error('Missing response');const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Oversized response');}chunks.push(value);}const bytes=new Uint8Array(size);let i=0;for(const chunk of chunks){bytes.set(chunk,i);i+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));}
export function createPublicRoster({getSamples,isBusy,setBusy,document=globalThis.document,requestFetch=globalThis.fetch,enabled=PUBLIC_ROSTER_ENABLED}){
 const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};let loading=false,submitting=false;
 async function refresh(){
  if(!enabled||loading)return;loading=true;$('roster-refresh').disabled=true;$('roster-status').textContent='Loading public device scores…';
  try{const response=await requestFetch(base+'volume-roster',{method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.status!==200)throw Error('Unavailable');const roster=await json(response,131072);if(!validateRoster(roster))throw Error('Invalid roster');$('roster-list').replaceChildren();
   for(const row of roster.rows){const item=el('li'),details=el('details'),summary=el('summary'),model=el('span',row.model),rating=el('strong',Math.round(row.score)+'/10'),label=el('span','Distance pickup');model.className='roster-model';rating.className='roster-rating';label.className='roster-rating-label';summary.append(model,rating,label);details.append(summary,el('p',row.score.toFixed(1)+'/10 precise average · '+row.testCount+' submitted test'+(row.testCount===1?'':'s')+' · rounded rating above; ranking uses the precise average'));
    for(const r of row.results)details.append(el('p',r.distance+' feet: average '+r.meanRmsDb.toFixed(1)+' dBFS · peak '+r.meanPeakDb.toFixed(1)+' dBFS · near-clipping '+r.meanClipping.toFixed(2)+'% · '+(r.meanDeltaDb===null?'background comparison unavailable':(r.meanDeltaDb>=0?'+':'')+r.meanDeltaDb.toFixed(1)+' dB vs background ('+r.comparableCount+' comparable)')));
    item.append(details);$('roster-list').append(item);
   }
   $('roster-status').textContent=roster.rows.length?(roster.truncated?'Showing the top 100 models.':'Highest average score first.'):'No public device scores have been submitted yet.';
  }catch{$('roster-status').textContent='Public device scores are unavailable. Try Refresh later.';}
  finally{loading=false;$('roster-refresh').disabled=false;}
 }
 $('roster-refresh').onclick=refresh;$('roster-refresh').disabled=!enabled;
 $('share-results').onclick=async()=>{
  if(!enabled||submitting||isBusy())return;
  if(!$('share-consent').checked){$('share-status').textContent='Choose public-display consent before submitting.';return;}
  let payload;try{payload=payloadFromSamples(getSamples());}catch(e){$('share-status').textContent=e.message;return;}
  submitting=true;setBusy(true);$('share-status').textContent='Submitting numeric results for public display…';
  try{const response=await requestFetch(base+'volume-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.status!==201)throw Error('Unconfirmed');const receipt=await json(response,1000);if(!validatePublicReceipt(receipt))throw Error('Unconfirmed');$('share-status').textContent='Published to the public device roster. Recordings stayed on this device.';$('share-consent').checked=false;void refresh();}
  catch{$('share-status').textContent='Publication was not confirmed. Try again later; identical same-day results are counted once.';}
  finally{submitting=false;setBusy(false);}
 };
 $('share-status').textContent=enabled?'Choose public-display consent, then Submit results.':'Public submission is not available yet.';
 $('roster-status').textContent=enabled?'Public device scores load here.':'Public device roster is not available yet.';
 if(enabled)void refresh();
 return {refresh};
}
