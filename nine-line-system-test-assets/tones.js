// Local Web Audio cue. A completed render does not establish that the device was audible.
export function playCue(context,kind,onDone,onUnavailable){
  let oscillator,gain,watchdog,finished=false;
  function cleanup(stop=false){
    clearTimeout(watchdog);
    if(oscillator){oscillator.onended=null;if(stop)try{oscillator.stop();}catch{}try{oscillator.disconnect();}catch{}}
    if(gain){try{gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(0,context.currentTime);gain.disconnect();}catch{}}
  }
  const cancel=()=>{if(finished)return;finished=true;cleanup(true);};
  try{
    if(context.state!=='running')throw Error('Sound context is not running');
    const now=context.currentTime,duration=kind==='start'?.18:.26;
    oscillator=context.createOscillator();gain=context.createGain();oscillator.type='sine';
    oscillator.frequency.setValueAtTime(kind==='start'?660:440,now);
    oscillator.frequency.linearRampToValueAtTime(kind==='start'?880:330,now+duration);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.06,now+.015);
    gain.gain.setValueAtTime(.06,now+duration-.04);gain.gain.linearRampToValueAtTime(0,now+duration);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.onended=()=>{if(finished)return;finished=true;cleanup();onDone();};
    watchdog=setTimeout(()=>{if(finished)return;finished=true;cleanup(true);onUnavailable();},duration*1000+1500);
    oscillator.start(now);oscillator.stop(now+duration);
  }catch{finished=true;cleanup(true);onUnavailable();}
  return cancel;
}

// Include a brief acoustic settling gap plus the browser's reported output buffering.
export function settlingMilliseconds(context){
  const latency=[context.baseLatency,context.outputLatency].reduce((sum,n)=>sum+(Number.isFinite(n)&&n>0?n:0),0);
  return 500+latency*1000;
}
