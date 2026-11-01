import {recognitionPayloadFromSamples,validateRecognitionRoster,validateRecognitionReceipt} from './recognition-contract.js';
// Enable only after the additive upstream deployment is verified and rollout approved.
export const RECOGNITION_ROSTER_ENABLED=true;
const base='/api/nine-line-system-test/';
async function json(response,limit){const reader=response.body?.getReader();if(!reader)throw Error('Missing response');const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Oversized response');}chunks.push(value);}const bytes=new Uint8Array(size);let i=0;for(const chunk of chunks){bytes.set(chunk,i);i+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));}
export function createRecognitionRoster({getSamples,isBusy,setBusy,document=globalThis.document,requestFetch=globalThis.fetch,enabled=RECOGNITION_ROSTER_ENABLED,allowSubmission=true}){
 const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};let loading=false,submitting=false;
 async function refresh(){
  if(!enabled||loading)return;loading=true;$('recognition-roster-refresh').disabled=true;$('recognition-roster-status').textContent='Loading public word-recognition scores…';
  try{const response=await requestFetch(base+'recognition-roster',{method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.status!==200)throw Error('Unavailable');const roster=await json(response,131072);if(!validateRecognitionRoster(roster))throw Error('Invalid roster');$('recognition-roster-list').replaceChildren();
   for(const row of roster.rows){const item=el('li'),details=el('details'),summary=el('summary'),model=el('span',row.model),rating=el('strong',Math.round(row.score)+'/10'),label=el('span','Word recognition');model.className='recognition-roster-model';rating.className='recognition-roster-rating';label.className='recognition-roster-rating-label';summary.append(model,rating,label);details.append(summary,el('p',row.score.toFixed(1)+'/10 precise average · ranking uses this average · '+row.testCount+' submitted complete test'+(row.testCount===1?'':'s')+' · mean recognition score, policy 2 · not certified device quality'));
    for(const r of row.results)details.append(el('p',r.distance+' feet: mean word-error rate '+(r.meanWer*100).toFixed(1)+'% · mean trial score '+r.meanScore.toFixed(1)+'/10 · distance declaration matched in '+r.distanceMatchedCount+' of '+row.testCount+' tests'));
    item.append(details);$('recognition-roster-list').append(item);
   }
   $('recognition-roster-status').textContent=roster.rows.length?(roster.truncated?'Showing the top 100 models.':'Highest mean word-recognition score first. Legacy level scores are separate.'):'No public word-recognition scores have been submitted yet.';
  }catch{$('recognition-roster-status').textContent='Public device scores are unavailable. Try Refresh later.';}
  finally{loading=false;$('recognition-roster-refresh').disabled=false;}
 }
 $('recognition-roster-refresh').onclick=refresh;$('recognition-roster-refresh').disabled=!enabled;
 $('share-results').onclick=async()=>{
  if(!enabled||!allowSubmission||submitting||isBusy())return;
  if(!$('share-consent').checked){$('share-status').textContent='Choose public-display consent before submitting.';return;}
  let payload;try{payload=recognitionPayloadFromSamples(getSamples());}catch(e){$('share-status').textContent=e.message;return;}
  submitting=true;setBusy(true);$('share-status').textContent='Submitting numeric results for public display…';
  try{const response=await requestFetch(base+'recognition-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.status!==201)throw Error('Unconfirmed');const receipt=await json(response,1000);if(!validateRecognitionReceipt(receipt))throw Error('Unconfirmed');$('share-status').textContent='Published numeric recognition results publicly. Recordings and transcripts stayed on this device.';$('share-consent').checked=false;void refresh();}
  catch{$('share-status').textContent='Publication was not confirmed. Try again later; identical same-day results are counted once.';}
  finally{submitting=false;setBusy(false);}
 };
 $('share-status').textContent=!allowSubmission?'Word-recognition submission is not available yet.':enabled?'Choose public-display consent, then Submit results.':'Word-recognition submission is not available yet.';
 $('recognition-roster-status').textContent=enabled?'Public device scores load here.':'Public device roster is not available yet.';
 if(!enabled||!allowSubmission){$('share-results').disabled=true;$('share-consent').disabled=true;}
 if(enabled)void refresh();
 return {refresh};
}
