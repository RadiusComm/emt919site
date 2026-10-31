import { db, latestDistances, summary } from './metrics.js';
import { sharedPayload } from './results.js';
import { MODEL_GROUPS, defaultOperatingSystem } from './models.js';
import { createCapture } from './capture.js';
const $=id=>document.getElementById(id);
const TEST_DISTANCES=[2,6,10,15,20];
const WORDS=['two','six','ten','fifteen','twenty'];
const fields=['make','model','manual','os','version','position','noise'];
const captureNotes=()=>Object.fromEntries(fields.map(k=>[k,$(k).value.trim()]));
let samples=[],seq=0,failed=false,lastCompleted='',shownStage=-1,submitting=false,pendingSilent=null;
const stageIndex=()=>!samples.some(s=>s.kind==='baseline')?0:TEST_DISTANCES.findIndex(d=>!samples.some(s=>s.kind==='speech'&&s.distance===d))+1||6;
const complete=()=>stageIndex()===6&&!pendingSilent;
const displayedStage=()=>pendingSilent?TEST_DISTANCES.indexOf(pendingSilent.distance)+1:stageIndex();
const supported=!!(window.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder&&(window.AudioContext||window.webkitAudioContext));
function phrase(stage){return 'This is the '+WORDS[stage-1]+'-foot test. The plane flies west. I can hear every word clearly.';}
function error(text){$('error').textContent=text;$('error').hidden=!text;}
const capture=createCapture({
  onState(phase,run){
    $('record-status').classList.toggle('active',phase==='recording');
    $('record-status').textContent=phase==='requesting'?'Requesting microphone access and preparing audio.':phase==='preparing'?'Microphone access ready — not recording. Get into position.':phase==='recording'?'● Recording — '+(run.stage===0?'stay quiet.':'read the script now.'):phase==='stopping'?'Microphone off — finishing recording.':'Microphone off — ready.';
    if(phase==='speaking-cue')$('record-status').textContent='Spoken start cue — wait for recording indicator.';
    if(phase==='settling')$('record-status').textContent='Cue finished — recording starts momentarily.';
    if(phase==='completion-cue')$('record-status').textContent='Microphone off — recording complete.';
    $('wake-status').textContent=run?.wakeStatus||'Screen-awake protection is requested only during a visible test step.';
    $('cue-status').textContent=run?.cueUnavailable?'Local spoken cue unavailable. Follow the visual recording indicator.':'Spoken cues use an available local English voice. Device volume or mute may prevent hearing them; follow the screen.';
    $('countdown').textContent=phase==='preparing'?run.remaining+' seconds to get into position':phase==='recording'?run.remaining+' seconds of recording left':'';
    $('countdown').hidden=!['preparing','recording'].includes(phase);
    const level=phase==='recording'?Math.min(0,db(run.level||0)):-100;
    $('meter-fill').style.width=(level+100)+'%';$('live-level').textContent=phase==='recording'?level.toFixed(1)+' dBFS':'— dBFS';document.querySelector('[role="meter"]').setAttribute('aria-valuenow',String(level));updateControls();
  },
  onError(message){failed=true;lastCompleted='';error(message);updateControls();},
  onComplete(run){
    const distance=run.stage===0?null:TEST_DISTANCES[run.stage-1];
    for(const old of samples.filter(s=>s.kind==='speech'&&s.distance===distance))URL.revokeObjectURL(old.url);
    samples=samples.filter(s=>!(s.kind==='speech'&&s.distance===distance));
    const sample={id:++seq,kind:run.stage===0?'baseline':'speech',distance,notes:run.notes,created:new Date().toISOString(),duration:run.elapsed,rms:Math.min(0,db(Math.sqrt(run.sum/run.count))),peak:Math.min(0,db(run.peak)),clipping:run.clipped/run.count*100,blob:run.blob,url:URL.createObjectURL(run.blob),noSignal:run.noSignal,rating:run.noSignal?'unclear':'unreviewed',listened:false,reviewNotes:''};
    samples.push(sample);pendingSilent=run.noSignal?sample:null;
    failed=false;lastCompleted=run.stage===0?'Baseline recorded.':run.noSignal?'No speech detected at this distance. Attempt complete — unsuccessful. Retry or continue.':'Step '+(run.stage+1)+' complete — '+distance+' feet recorded. Clarity still needs your review.';error('');render();
  }
});
function renderTests(){
  const index=stageIndex();$('test-progress').textContent=samples.length+'/6 recording steps complete';
  $('baseline-status').textContent=samples.some(s=>s.kind==='baseline')?'Baseline recorded':'Not recorded';
  TEST_DISTANCES.forEach((d,i)=>{const sample=samples.find(s=>s.kind==='speech'&&s.distance===d);$('test-status-'+d).textContent=sample?(sample.noSignal?'No speech detected — unsuccessful':'Recorded — review clarity'):index===i+1?'Current step':'Waiting';});
}
function renderGuidance(){
  const index=displayedStage(),busy=capture.phase!=='idle';
  $('completion-status').textContent=lastCompleted||(pendingSilent?'Previous valid attempt: no speech detected at this distance — unsuccessful.':'');
  $('completion-status').classList.toggle('unsuccessful',!!pendingSilent);
  $('stage-heading').textContent=index===6?'All recording steps complete':'Step '+(index+1)+' of 6 — '+(index===0?'background baseline':TEST_DISTANCES[index-1]+' feet');
  $('stage-instruction').textContent=index===6?'Listen to each recording below and rate clarity.':index===0?'Stay quiet. Start records five seconds of room noise, then stops automatically.':'Measure '+TEST_DISTANCES[index-1]+' feet from this fixed phone. Read and remember the script. Start gives you preparation time, then records for ten seconds and stops.';
  $('script-box').hidden=index===0||index===6;
  $('script').textContent=index>0&&index<6?phrase(index):'';
  $('preparation-label').hidden=index===0||index===6;
  if(index!==shownStage){$('preparation').value=index===1?'5':'10';shownStage=index;}
  $('start').hidden=index===6;
  $('start').textContent=pendingSilent?(stageIndex()===6?'Continue to final results':'Continue to Step '+(stageIndex()+1)):(failed?'Retry':'Start')+' Step '+(index+1)+(index===0?' — baseline':' — '+TEST_DISTANCES[index-1]+' feet');
  $('retry-distance').hidden=!pendingSilent;$('retry-distance').textContent='Retry Step '+(index+1)+' — '+TEST_DISTANCES[index-1]+' feet';
  $('results').hidden=!complete();$('review-pending').hidden=complete();
  $('review-pending').textContent='Final review and optional submission appear after all six recording steps.';
  $('stage-card').setAttribute('aria-busy',String(busy));
}
function updateControls(){
  const busy=capture.phase!=='idle';
  fields.forEach(k=>$(k).disabled=busy||samples.length>0);$('preparation').disabled=busy;
  $('start').disabled=busy||!supported||submitting;$('cancel').disabled=!busy;
  $('retry-distance').disabled=busy||submitting;
  $('clear').disabled=(!samples.length&&!busy)||submitting;
  $('share-results').disabled=busy||!complete()||submitting;
  renderTests();renderGuidance();
}
function renderModelChoices(){
  const make=$('make').value,groups=Object.entries(MODEL_GROUPS[make]||{});
  const add=(parent,value,label=value)=>{const option=document.createElement('option');option.value=value;option.textContent=label;parent.append(option);};
  $('model').replaceChildren();add($('model'),'','Select model');if(make==='Apple')groups.sort((a,b)=>Number(b[0])-Number(a[0]));
  for(const [label,models]of groups){const group=document.createElement('optgroup');group.label=label;models.forEach(model=>add(group,model));$('model').append(group);}add($('model'),'Other','Other / model not listed');$('model').value='';
}
$('make').onchange=()=>{if(capture.phase!=='idle'||samples.length)return;$('manual').value='';renderModelChoices();$('model').onchange();};
$('model').onchange=()=>{$('manual-label').hidden=$('make').value!=='Other';$('os').value=defaultOperatingSystem($('make').value,$('model').value);$('version').value='';};
$('os').onchange=()=>{$('version').value='';};
$('start').onclick=()=>{
  if(capture.phase!=='idle'||complete()||submitting||!supported)return;
  if(pendingSilent){pendingSilent=null;lastCompleted='';failed=false;error('');render();return;}
  return startStage(stageIndex());
};
function startStage(stage){
  if(capture.phase!=='idle'||submitting||!supported)return;
  if(!$('make').value||!$('model').value||!$('os').value)return error('Select phone make, model and operating system before starting.');
  if(samples.some(s=>fields.some(k=>s.notes[k]!==$(k).value.trim())))return error('The phone setup changed. Delete recordings and restart.');
  document.querySelectorAll('audio').forEach(a=>a.pause());error('');lastCompleted='';
  return capture.start(stage,captureNotes(),Number($('preparation').value));
}
$('retry-distance').onclick=()=>{if(pendingSilent&&capture.phase==='idle'&&!submitting)return startStage(displayedStage());};
$('cancel').onclick=()=>capture.cancel();
if(!supported){$('support').hidden=false;$('support').textContent='Recording is unavailable here. Open this page directly over HTTPS in a browser with microphone, MediaRecorder and Web Audio support. Embedded previews may block access.';}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(capture.phase!=='idle')capture.cancel('This step was cancelled when the page became hidden. Retry when ready.');document.querySelectorAll('audio').forEach(a=>a.pause());}});
window.addEventListener('pagehide',()=>{capture.cancel('');document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];pendingSilent=null;lastCompleted='';failed=false;render();});
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function renderSummary(){const result=summary(samples);$('target-result').textContent=result.target;$('farthest-result').textContent=result.farthest ? result.farthest+' ft':'—';const latest=latestDistances(samples);const distances=TEST_DISTANCES;$('distance-table').replaceChildren();for(const d of distances){const s=latest.find(x=>x.distance===d);const row=el('tr');[d+' ft'+(d===6?' · target':''),s?(s.noSignal?'No speech detected — unsuccessful':s.listened?s.rating:'unreviewed'):'Untested',s?s.rms.toFixed(1)+' dBFS':'—'].forEach(t=>row.append(el('td',t)));$('distance-table').append(row);}$('chart').replaceChildren();const labels=[];for(const d of TEST_DISTANCES){const s=latest.find(x=>x.distance===d);const rating=s?(s.noSignal?'unclear':s.listened?s.rating:'unreviewed'):'untested';const bar=el('div',undefined,'chart-bar '+rating);bar.title=d+' ft: '+rating;if(TEST_DISTANCES.includes(d))bar.append(el('span',String(d)));$('chart').append(bar);if(s)labels.push(d+' feet '+rating);}$('chart').setAttribute('aria-label','Clarity review and no-signal outcomes by measured distance. '+(labels.join('; ')||'No speech samples.')+' Untested distances have no result. Table below provides values.');}
function render(){
  renderTests();
  $('share-consent').checked=false;
  renderSummary();$('sample-count').textContent=samples.length;$('empty').hidden=!!samples.length;$('samples').replaceChildren();
  for(const s of [...samples].reverse()){
    const card=el('article',undefined,'sample');const heading=el('div',undefined,'sample-heading');heading.append(el('strong',s.kind==='baseline'?'Background baseline':s.distance+' feet · speech'));const time=el('time',new Date(s.created).toLocaleTimeString());time.dateTime=s.created;heading.append(time);card.append(heading);
    card.append(el('p',`${s.duration.toFixed(1)}s · RMS ${s.rms.toFixed(1)} dBFS · peak ${s.peak.toFixed(1)} dBFS · near-clip samples ${s.clipping.toFixed(2)}%`,'metrics'));
    const audio=el('audio');audio.controls=true;audio.setAttribute('controlsList','nodownload noremoteplayback');audio.disableRemotePlayback=true;audio.preload='none';audio.src=s.url;audio.setAttribute('aria-label',s.kind==='baseline'?'Play background baseline':'Play speech at '+s.distance+' feet');
    audio.onplay=()=>document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();});
    card.append(audio);
    if(s.kind==='speech'){
      card.append(el('p','Words read: “'+phrase(TEST_DISTANCES.indexOf(s.distance)+1)+'”','hint'));
      const rating=el('div',undefined,'rating');const label=el('label','Your clarity rating (self-reported)');const select=el('select');select.setAttribute('aria-label','Clarity rating for '+s.distance+' feet');for(const [value,text] of [['unreviewed','Not reviewed'],['clear','Clear — every word understood'],['partial','Partial — some words uncertain'],['unclear','Unclear — words missing or unintelligible']]){const option=el('option',text);option.value=value;select.append(option);}select.value=s.rating;select.disabled=s.noSignal||!s.listened;label.append(select);rating.append(label);const hint=el('p',s.noSignal?'No speech detected at this distance — unsuccessful. This near-silence signal check cannot prove intelligibility. Retry this distance to replace the attempt.':s.listened?'Rate what you heard against the phrase. This is your self-reported review.':'Finish playback to enable your rating. Your rating is self-reported; the browser cannot verify what you heard.','hint');rating.append(hint);card.append(rating);
      audio.onended=()=>{s.listened=true;select.disabled=s.noSignal;if(s.noSignal){renderSummary();return;}hint.textContent='Rate what you heard against the phrase. This is your self-reported review.';renderSummary();};
      select.onchange=()=>{if(s.noSignal){select.value='unclear';return;}s.rating=select.value;renderSummary();renderTests();renderGuidance();};
      const note=el('label','Review notes');note.className='sample-notes';const input=el('input');input.maxLength=300;input.placeholder='e.g. Last sentence muffled';input.value=s.reviewNotes;input.oninput=()=>s.reviewNotes=input.value;note.append(input);card.append(note);
    }
    const details=el('details');details.append(el('summary','Recorded setup'));details.append(el('p',Object.entries(s.notes).map(([k,v])=>`${k}: ${v||'not noted'}`).join(' · '),'hint'));card.append(details);
    const actions=el('div',undefined,'sample-actions');if(s.noSignal){const retry=el('button','Retry '+s.distance+' feet');retry.onclick=()=>{if(capture.phase!=='idle'||submitting)return;pendingSilent=s;lastCompleted='';failed=false;render();return startStage(displayedStage());};actions.append(retry);}const del=el('button','Delete recording','danger');del.onclick=()=>{capture.cancel('');if(pendingSilent===s)pendingSilent=null;lastCompleted='';failed=false;audio.pause();audio.removeAttribute('src');URL.revokeObjectURL(s.url);samples=samples.filter(x=>x!==s);render();};actions.append(del);card.append(actions);$('samples').append(card);
  }updateControls();
}
$('clear').onclick=()=>{capture.cancel('');failed=false;lastCompleted='';error('');document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];pendingSilent=null;render();$('clear-status').textContent='All samples and ratings deleted from this tab. Your setup notes remain.';};
render();
$('share-results').onclick=async()=>{const button=$('share-results');if(button.disabled||!complete()||capture.phase!=='idle'||submitting)return;if(!$('share-consent').checked){$('share-status').textContent='Submission is optional. Select the consent checkbox before submitting.';return;}try{const payload=sharedPayload(samples);submitting=true;updateControls();const response=await fetch('/api/nine-line-system-test/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(response.status!==201)throw Error(response.status===429?'Sharing is temporarily limited. Try again later.':'Shared storage is unavailable. Nothing was confirmed saved. Try again later.');const receipt=await response.json();if(receipt.message!=='Result stored privately.')throw Error('Storage was not confirmed. Try again later.');$('share-status').textContent='Results submitted privately to EMT919. Recordings and notes stayed on this phone.';$('share-consent').checked=false;}catch(e){$('share-status').textContent=e.message||'Could not confirm submission. Try again later.';}finally{submitting=false;updateControls();}};






