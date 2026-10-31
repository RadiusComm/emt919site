// Fixed-phrase comparison is performed AFTER inference; the model never receives this phrase.
export const ENGINE_VERSION=1;
export const DISTANCES=[2,6,10,15,20];
const names={2:'two',6:'six',10:'ten',15:'fifteen',20:'twenty'};
export function expectedPhrase(distance){if(!DISTANCES.includes(distance))throw Error('Invalid distance');return `This is the ${names[distance]} foot test. The plane flies west. I can hear every word clearly.`;}
export function words(text){return String(text).toLowerCase().replace(/\b(2|6|10|15|20)\b/g,n=>names[n]).replace(/[^a-z\s]/g,' ').trim().split(/\s+/).filter(Boolean);}
export function wordErrorRate(reference,hypothesis){const a=words(reference),b=words(hypothesis);if(!a.length)throw Error('Empty reference');let prev=b.map((_,i)=>i+1);prev.unshift(0);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return prev[b.length]/a.length;}
export function estimate(text,distance,{noSignal=false,clipping=0}={}){
 if(noSignal)text='';const expected=expectedPhrase(distance),tokens=words(text),wer=wordErrorRate(expected,text);
 // Require exactly one measured-distance declaration; contradictory distances cannot pass.
 const mentions=[];for(let i=0;i<tokens.length-1;i++)if(['foot','feet'].includes(tokens[i+1]))for(const [n,w]of Object.entries(names))if(tokens[i]===w)mentions.push(Number(n));
 const distanceMatched=mentions.length===1&&mentions[0]===distance;
 const status=!noSignal&&tokens.length>0&&wer<=.2&&distanceMatched?1:2;
 return {version:ENGINE_VERSION,status,wer:Math.min(10,wer),distanceMatched:distanceMatched?1:0,clippingWarning:Number.isFinite(clipping)&&clipping>=1?1:0};
}
export const uncertain=(clipping=0)=>({version:ENGINE_VERSION,status:3,wer:null,distanceMatched:0,clippingWarning:clipping>=1?1:0});
export function estimateLabel(result){return !result?'Not analyzed':result.status===1?'Phrase recognized — estimate':result.status===2?'Phrase not reliably recognized':'Uncertain — analysis unavailable';}
export function automaticSummary(samples){const speech=samples.filter(s=>s.kind==='speech');return {farthest:Math.max(0,...speech.filter(s=>s.automatic?.status===1).map(s=>s.distance)),complete:DISTANCES.every(d=>speech.some(s=>s.distance===d&&[1,2,3].includes(s.automatic?.status)))};}
