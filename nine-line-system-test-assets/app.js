import { PHRASE, db, frameMetrics, latestDistances, summary, validDistance } from './metrics.js';
import { MODELS } from './models.js';
import { summaryRecord, sharedPayload, loadHistory, saveHistory, deleteHistory } from './history.js';
const $ = id => document.getElementById(id);
let mode = 'baseline', phase = 'idle', epoch = 0, active = null, samples = [], seq = 0;
const fields = ['make','model','manual','os','version','device','position','case','noise'];
const captureNotes = () => Object.fromEntries(fields.map(k => [k, $(k).value.trim()]));
const supported = !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext));
if (!supported) { $('support').hidden = false; $('support').textContent = 'Recording is unavailable here. Open this page directly over HTTPS in a browser that supports microphone capture, MediaRecorder and Web Audio. An embedded preview may block microphone permission.'; }
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
function updateControls() {
  const busy = phase !== 'idle';
  $('start').disabled = busy || !supported;
  $('stop').disabled = phase !== 'recording'; $('cancel').disabled = !busy;
  for (const el of [$('baseline-mode'),$('speech-mode'),$('distance'),...document.querySelectorAll('[data-distance]'),...fields.map($)]) el.disabled = busy;
  $('clear').disabled = !samples.length || busy; $('report').disabled = !samples.length || busy;
}
function setMode(next) { if (phase !== 'idle') return; mode = next; $('baseline-mode').classList.toggle('selected', mode === 'baseline'); $('speech-mode').classList.toggle('selected', mode === 'speech'); $('baseline-mode').setAttribute('aria-pressed', mode === 'baseline'); $('speech-mode').setAttribute('aria-pressed', mode === 'speech'); $('baseline-instructions').hidden = mode !== 'baseline'; $('speech-instructions').hidden = mode !== 'speech'; }
$('make').onchange=()=>{const options=MODELS[$('make').value]||[];$('model').replaceChildren();for(const text of ['',...options,'Other']){const option=document.createElement('option');option.value=text;option.textContent=text||'Select model';$('model').append(option);}$('model').onchange();};
$('model').onchange=()=>{$('manual-label').hidden=$('model').value!=='Other';};
$('baseline-mode').onclick = () => setMode('baseline'); $('speech-mode').onclick = () => setMode('speech');
document.querySelectorAll('[data-distance]').forEach(b => b.onclick = () => { $('distance').value = b.dataset.distance; });
function release(run) {
  if (!run) return; clearTimeout(run.limit); clearInterval(run.clock); cancelAnimationFrame(run.raf);
  run.stream?.getTracks().forEach(t => { t.onended = null; t.stop(); });
  try { run.source?.disconnect(); } catch {} try { run.analyser?.disconnect(); } catch {}
  if (run.context && run.context.state !== 'closed') run.context.close().catch(() => {});
}
function reset() { active = null; phase = 'idle'; $('record-status').classList.remove('active'); $('record-status').textContent = 'Microphone off · ready'; $('meter-fill').style.width = '0'; $('live-level').textContent = '— dBFS'; document.querySelector('[role="meter"]').setAttribute('aria-valuenow','-100'); updateControls(); }
function cancel(message = '') {
  epoch++; const run = active; if (run) { run.discard = true; try { if (run.recorder?.state !== 'inactive') run.recorder.stop(); } catch {} release(run); }
  reset(); if (message) error(message);
}
async function start() {
  if (phase !== 'idle' || !supported) return;
  const distance = Number($('distance').value);
  if (!$('make').value || !$('model').value || !$('os').value) return error('Select the device make, model and operating system before recording.');
  if (samples.some(s=>fields.some(k=>s.notes[k]!==$(k).value.trim()))) return error('This session has samples from a different setup. Download or save its summary, then delete samples before changing the device or setup.');
  if (mode === 'speech' && !validDistance(distance)) return error('Enter a measured whole-foot distance from 1 to 30.');
  if (mode === 'speech' && !samples.some(s => s.kind === 'baseline')) return error('Record a background baseline first so you can compare room noise.');
  error(''); phase = 'requesting'; const ticket = ++epoch;
  const run = {ticket, kind:mode, distance: mode === 'speech' ? distance : null, notes:captureNotes(), sum:0, count:0, peak:0, clipped:0, chunks:[], discard:false}; active = run;
  $('record-status').textContent = 'Waiting for microphone permission…'; updateControls();
  try {
    run.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    if (ticket !== epoch || run.discard) { release(run); return; }
    run.settings = run.stream.getAudioTracks()[0]?.getSettings?.() || {};
    run.context = new (window.AudioContext || window.webkitAudioContext)();
    if (run.context.state === 'suspended') await run.context.resume();
    if (ticket !== epoch || run.discard) { release(run); return; }
    run.source = run.context.createMediaStreamSource(run.stream); run.analyser = run.context.createAnalyser(); run.analyser.fftSize = 2048; run.source.connect(run.analyser);
    const types = ['audio/webm;codecs=opus','audio/mp4','audio/webm']; const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    run.recorder = mime ? new MediaRecorder(run.stream,{mimeType:mime}) : new MediaRecorder(run.stream);
    run.recorder.ondataavailable = e => { if (e.data.size) run.chunks.push(e.data); };
    run.recorder.onerror = () => { if (active === run) cancel('Recording failed. The sample was discarded; try again.'); };
    run.recorder.onstop = () => {
      release(run); if (run.discard || ticket !== epoch) return;
      const blob = new Blob(run.chunks,{type:run.recorder.mimeType || run.chunks[0]?.type || 'audio/webm'});
      if (!blob.size || !run.count) { reset(); return error('No usable audio was captured. Check the microphone and try again.'); }
      const sample = {id:++seq,kind:run.kind,distance:run.distance,notes:run.notes,settings:run.settings,created:new Date().toISOString(),duration:(performance.now()-run.started)/1000,rms:db(Math.sqrt(run.sum/run.count)),peak:db(run.peak),clipping:run.clipped/run.count*100,blob,url:URL.createObjectURL(blob),rating:'unreviewed',listened:false,reviewNotes:''};
      samples.push(sample); reset(); render();
    };
    run.stream.getTracks().forEach(t => t.onended = () => { if (active === run && phase === 'recording') cancel('The microphone disconnected. This incomplete sample was discarded.'); });
    run.recorder.start(250); run.started = performance.now(); phase = 'recording'; $('record-status').classList.add('active'); updateControls();
    const clock = () => { $('record-status').textContent = `● Recording ${run.kind === 'baseline' ? 'background' : run.distance+' ft'} · ${Math.floor((performance.now()-run.started)/1000)}s / 60s`; }; clock(); run.clock = setInterval(clock,250);
    const data = new Float32Array(run.analyser.fftSize);
    const meter = () => { if (active !== run || phase !== 'recording') return; run.analyser.getFloatTimeDomainData(data); const m=frameMetrics(data); run.sum+=m.sum;run.count+=m.count;run.peak=Math.max(run.peak,m.peak);run.clipped+=m.clipped;const level=db(m.rms);$('live-level').textContent=level.toFixed(1)+' dBFS';$('meter-fill').style.width=((level+100))+'%';document.querySelector('[role="meter"]').setAttribute('aria-valuenow',level.toFixed(1));run.raf=requestAnimationFrame(meter); }; meter();
    run.limit=setTimeout(stop,60000);
  } catch(e) {
    release(run); if (ticket !== epoch) return; reset();
    const messages={NotAllowedError:'Microphone permission was denied or blocked. Allow microphone access in browser site settings, and open this page directly if it is embedded.',NotFoundError:'No microphone was found. Connect or enable a microphone and try again.',NotReadableError:'The microphone is unavailable or in use by another app. Close other recording apps and retry.',SecurityError:'Microphone access is blocked in this context. Open this page directly over HTTPS.'};
    error(messages[e.name] || 'Could not start recording in this browser. Check microphone permission and browser support, then try again.');
  }
}
function stop() { if (phase !== 'recording' || !active) return; phase='stopping'; const run=active; clearTimeout(run.limit); clearInterval(run.clock); cancelAnimationFrame(run.raf); $('record-status').textContent='Finishing sample · microphone off';updateControls();try{run.recorder.stop();release(run);}catch{cancel('Could not finish the sample. Please try again.');} }
$('start').onclick=start;$('stop').onclick=stop;$('cancel').onclick=()=>cancel();
document.addEventListener('visibilitychange',()=>{if(document.hidden && phase!=='idle')cancel('Recording cancelled when the page became hidden. Start a new sample when ready.');if(document.hidden)document.querySelectorAll('audio').forEach(a=>a.pause());});
window.addEventListener('pagehide',()=>{cancel();document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];});
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function download(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function renderSummary(){const result=summary(samples);$('target-result').textContent=result.target;$('farthest-result').textContent=result.farthest ? result.farthest+' ft':'—';const latest=latestDistances(samples);const distances=[...new Set([2,6,...latest.map(s=>s.distance)])].sort((a,b)=>a-b);$('distance-table').replaceChildren();for(const d of distances){const s=latest.find(x=>x.distance===d);const row=el('tr');[d+' ft'+(d===6?' · target':''),s?(s.listened?s.rating:'unreviewed'):'Untested',s?s.rms.toFixed(1)+' dBFS':'—'].forEach(t=>row.append(el('td',t)));$('distance-table').append(row);}$('chart').replaceChildren();const labels=[];for(let d=1;d<=30;d++){const s=latest.find(x=>x.distance===d);const rating=s?(s.listened?s.rating:'unreviewed'):'untested';const bar=el('div',undefined,'chart-bar '+rating);bar.title=d+' ft: '+rating;if([1,2,6,10,15,20,25,30].includes(d))bar.append(el('span',String(d)));$('chart').append(bar);if(s)labels.push(d+' feet '+rating);}$('chart').setAttribute('aria-label','Human clarity by measured distance. '+(labels.join('; ')||'No speech samples.')+' Untested distances have no result. Table below provides values.');}
function render(){
  $('share-consent').checked=false;
  renderSummary();$('sample-count').textContent=samples.length;$('empty').hidden=!!samples.length;$('samples').replaceChildren();
  for(const s of [...samples].reverse()){
    const card=el('article',undefined,'sample');const heading=el('div',undefined,'sample-heading');heading.append(el('strong',s.kind==='baseline'?'Background baseline':s.distance+' feet · speech'));const time=el('time',new Date(s.created).toLocaleTimeString());time.dateTime=s.created;heading.append(time);card.append(heading);
    card.append(el('p',`${s.duration.toFixed(1)}s · RMS ${s.rms.toFixed(1)} dBFS · peak ${s.peak.toFixed(1)} dBFS · near-clip samples ${s.clipping.toFixed(2)}%`,'metrics'));
    const audio=el('audio');audio.controls=true;audio.preload='none';audio.src=s.url;audio.setAttribute('aria-label',s.kind==='baseline'?'Play background baseline':'Play speech at '+s.distance+' feet');
    audio.onplay=()=>document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();});
    card.append(audio);
    if(s.kind==='speech'){
      const rating=el('div',undefined,'rating');const label=el('label','Human clarity rating');const select=el('select');select.setAttribute('aria-label','Clarity rating for '+s.distance+' feet');for(const [value,text] of [['unreviewed','Not reviewed'],['clear','Clear — every word understood'],['partial','Partial — some words uncertain'],['unclear','Unclear — words missing or unintelligible']]){const option=el('option',text);option.value=value;select.append(option);}select.value=s.rating;select.disabled=!s.listened;label.append(select);rating.append(label);const hint=el('p',s.listened?'Rate what you actually heard against the phrase.':'Play the whole sample before assigning a clarity rating.','hint');rating.append(hint);card.append(rating);
      audio.onended=()=>{s.listened=true;select.disabled=false;hint.textContent='Rate what you actually heard against the phrase.';renderSummary();};
      select.onchange=()=>{s.rating=select.value;renderSummary();};
      const note=el('label','Review notes');note.className='sample-notes';const input=el('input');input.maxLength=300;input.placeholder='e.g. Last sentence muffled';input.value=s.reviewNotes;input.oninput=()=>s.reviewNotes=input.value;note.append(input);card.append(note);
    }
    const details=el('details');details.append(el('summary','Recorded setup'));details.append(el('p',Object.entries(s.notes).map(([k,v])=>`${k}: ${v||'not noted'}`).join(' · '),'hint'));card.append(details);
    const actions=el('div',undefined,'sample-actions');const save=el('button','Download audio');save.onclick=()=>download(s.blob,`covert-${s.kind}-${s.distance||'room'}-${s.id}.${s.blob.type.includes('mp4')?'m4a':'webm'}`);const del=el('button','Delete sample','danger');del.onclick=()=>{audio.pause();audio.removeAttribute('src');URL.revokeObjectURL(s.url);samples=samples.filter(x=>x!==s);render();};actions.append(save,del);card.append(actions);$('samples').append(card);
  }updateControls();
}
$('clear').onclick=()=>{document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];render();$('clear-status').textContent='All samples and ratings deleted from this tab. Your setup notes remain.';};
$('report').onclick=()=>{const report={title:'Covert Mode Tester',created:new Date().toISOString(),targetFeet:6,phrase:PHRASE,summary:summary(samples),limits:'Setup-specific browser capture; manually measured distance and human clarity ratings. Six feet is an owner-selected target, not a universal standard. Untested distances are not passes. Not an operational safety guarantee. Browser capture may differ from the Nine Line native pipeline.',metricMethod:'Approximate uncalibrated digital RMS, peak and fraction of samples >=0.99 from periodic Web Audio analyser frames, not sound pressure, inferred distance or intelligibility. Browser processing settings are requested, not guaranteed.',samples:samples.map(({blob,url,...rest})=>rest)};download(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),'covert-mode-report.json');};
render();
function renderHistory(){const list=loadHistory();$('history').replaceChildren();for(const record of [...list].reverse()){const row=el('p',record.device+' · '+new Date(record.saved).toLocaleDateString()+' · 6 ft: '+record.summary.target+' · farthest clear: '+(record.summary.farthest?record.summary.farthest+' ft':'none'),'hint');$('history').append(row);}$('export-history').disabled=!list.length;$('delete-history').disabled=!list.length;}
$('save-history').onclick=()=>{if(!$('save-consent').checked){$('history-status').textContent='Select the opt-in checkbox to save a summary on this browser.';return;}try{saveHistory(summaryRecord(samples));$('save-consent').checked=false;$('history-status').textContent='Summary saved locally. Audio was not saved. Up to 50 summaries are kept.';renderHistory();}catch(e){$('history-status').textContent=e.message||'Local storage is unavailable.';}};
$('delete-history').onclick=()=>{try{deleteHistory();renderHistory();$('history-status').textContent='Local summary history deleted.';}catch{$('history-status').textContent='Could not access browser storage.';}};
$('export-history').onclick=()=>download(new Blob([JSON.stringify({title:'Local Covert Mode Tester history',limits:'Self-reported browser/setup-specific results, not native compatibility rankings.',history:loadHistory()},null,2)],{type:'application/json'}),'covert-local-history.json');
$('share-results').onclick=async()=>{const button=$('share-results');if(button.disabled)return;if(!$('share-consent').checked){$('share-status').textContent='Sharing is optional. Select the consent checkbox before sharing.';return;}try{const payload=sharedPayload(samples);button.disabled=true;const response=await fetch('/api/nine-line-system-test/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(response.status!==201)throw Error(response.status===429?'Shared collection has reached its daily limit. Keep a local report and retry another day.':'Shared storage is unavailable. Nothing was confirmed saved; keep a local report.');const receipt=await response.json();if(receipt.message!=='Result stored privately.')throw Error('Storage was not confirmed. Keep your local report.');$('share-status').textContent='Summary shared privately with EMT919. Recordings and notes stayed on this phone.';$('share-consent').checked=false;}catch(e){$('share-status').textContent=e.message||'Could not confirm sharing. Keep your local report.';}finally{button.disabled=false;}};
renderHistory();


