export function createLocalAnalyzer({onProgress=()=>{},WorkerClass=globalThis.Worker}={}){
 let worker=null,ready=false,next=0,pending=null;
 function stop(reason='Local analysis cancelled.'){
  ready=false;worker?.terminate();worker=null;
  if(pending){clearTimeout(pending.timer);pending.reject(Error(reason));pending=null;}
 }
 function request(type,extra={},transfer=[]){
  if(pending)return Promise.reject(Error('Local analysis is already running.'));
  return new Promise((resolve,reject)=>{const id=++next;pending={id,resolve,reject,timer:setTimeout(()=>stop('Local word recognition timed out. Retry; playback remains available.'),type==='load'?180000:120000)};try{worker.postMessage({id,type,...extra},transfer);}catch(error){clearTimeout(pending.timer);pending=null;reject(error);}});
 }
 async function load(){
  if(ready)return;if(!WorkerClass)throw Error('This browser cannot run local analysis.');
  if(worker)throw Error('Model preparation is already running.');
  worker=new WorkerClass(new URL('./worker.js',import.meta.url),{type:'module'});const ownWorker=worker;
  worker.onerror=()=>{if(worker===ownWorker)stop('Local model could not load. Retry; playback remains available.');};
  worker.onmessage=({data})=>{if(worker!==ownWorker||!pending||data.id!==pending.id)return;if(data.type==='progress'){onProgress(data);return;}const task=pending;pending=null;clearTimeout(task.timer);if(data.type==='error'){stop();task.reject(Error(data.message));return;}if(data.type==='ready')ready=true;task.resolve(data);};
  try{await request('load');}catch(error){if(worker===ownWorker)stop();throw error;}
 }
 async function analyze(blob){
  if(!ready)throw Error('Prepare local word recognition first.');
  const ticket=next;
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  const context=new Audio();let decoded,mono;
  try{decoded=await context.decodeAudioData(await blob.arrayBuffer());if(decoded.duration<.1||decoded.duration>15)throw Error('Unsupported recording duration');const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();mono=(await offline.startRendering()).getChannelData(0).slice();}finally{await context.close().catch(()=>{});}
  if(!ready||ticket!==next){mono?.fill(0);throw Error('Analysis cancelled.');}
  if(!mono.every(Number.isFinite)){mono.fill(0);throw Error('Invalid audio data');}
  const result=await request('analyze',{pcm:mono},[mono.buffer]);return result.text;
 }
 return {load,analyze,cancel:()=>{next++;stop();},get ready(){return ready;}};
}
