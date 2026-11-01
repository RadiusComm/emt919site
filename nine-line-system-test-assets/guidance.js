// Local Web Audio only. Successful scheduling cannot establish device audibility.
export function playCue(context,kind,done,unavailable){
 let finished=false,timer;const nodes=[];
 const cleanup=stop=>{clearTimeout(timer);for(const {osc,gain} of nodes){osc.onended=null;if(stop)try{osc.stop();}catch{}try{osc.disconnect();gain.disconnect();}catch{}}};
 const finish=ok=>{if(finished)return;finished=true;cleanup(!ok);if(ok)done();else unavailable();};
 try{
  if(context.state!=='running')throw Error('Audio output unavailable');
  const now=context.currentTime;
  // Non-overlapping sine pulses: bounded peak 0.45 (-6.9 dBFS), soft attack/release.
  const notes=kind==='start'?[[880,0,.28],[1175,.38,.28]]:[[1175,0,.24],[880,.34,.24],[660,.68,.24]];
  for(const [frequency,offset,duration]of notes){
   const osc=context.createOscillator(),gain=context.createGain();nodes.push({osc,gain});osc.type='sine';osc.frequency.setValueAtTime(frequency,now+offset);
   gain.gain.setValueAtTime(0,now+offset);gain.gain.linearRampToValueAtTime(.45,now+offset+.02);gain.gain.setValueAtTime(.45,now+offset+.12);gain.gain.exponentialRampToValueAtTime(.001,now+offset+duration);gain.gain.setValueAtTime(0,now+offset+duration+.005);
   osc.connect(gain);gain.connect(context.destination);
   osc.start(now+offset);osc.stop(now+offset+duration+.01);
  }
  nodes.at(-1).osc.onended=()=>finish(true);
  timer=setTimeout(()=>finish(false),2500);
 }catch{finish(false);}
 return ()=>{if(finished)return;finished=true;cleanup(true);};
}
export function keepAwake(isActive,onStatus){
  let ended=false,sentinel;
  const release=()=>{ended=true;if(sentinel){sentinel.release().catch(()=>{});sentinel=null;}};
  if(!navigator.wakeLock?.request||document.hidden){onStatus('Screen-awake protection unavailable. Keep this page visible; hiding it cancels the current step.');return release;}
  try{Promise.resolve(navigator.wakeLock.request('screen')).then(lock=>{
    if(ended||document.hidden||!isActive()){lock.release().catch(()=>{});return;}
    sentinel=lock;onStatus('Screen-awake protection active while this step runs.');
    lock.addEventListener?.('release',()=>{if(!ended)onStatus('Screen-awake protection released. Keep this page visible; hiding it cancels the current step.');});
  }).catch(()=>{if(!ended)onStatus('Screen-awake protection unavailable. Keep this page visible; hiding it cancels the current step.');});}
  catch{onStatus('Screen-awake protection unavailable. Keep this page visible.');}
  return release;
}
