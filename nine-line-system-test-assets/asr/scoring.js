// Fixed-phrase comparison is performed AFTER inference; the model never receives this phrase.
export const ENGINE_VERSION=2;
export const DISTANCES=[5,10,20];
const names={5:'five',10:'ten',20:'twenty'};
export function expectedPhrase(distance){if(!DISTANCES.includes(distance))throw Error('Invalid distance');return `This is the ${names[distance]} foot test. The plane flies west. I can hear every word clearly.`;}
export function words(text){return String(text).toLowerCase().replace(/\b(5|10|20)\b/g,n=>names[n]).replace(/[^a-z\s]/g,' ').trim().split(/\s+/).filter(Boolean);}
// Levenshtein alignment: deterministic ties prefer match/substitution, then deletion,
// then insertion. No transcript or token alignment is retained in the result.
export function wordAlignment(reference,hypothesis){
 const a=words(reference),b=words(hypothesis);if(!a.length)throw Error('Empty reference');
 const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)dp[i][0]=i;for(let j=0;j<=b.length;j++)dp[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+Number(a[i-1]!==b[j-1]));
 let i=a.length,j=b.length,substitutions=0,deletions=0,insertions=0;
 while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+Number(a[i-1]!==b[j-1])){substitutions+=Number(a[i-1]!==b[j-1]);i--;j--;}else if(i&&dp[i][j]===dp[i-1][j]+1){deletions++;i--;}else{insertions++;j--;}}
 return {substitutions,deletions,insertions,referenceWords:a.length,wer:dp[a.length][b.length]/a.length};
}
export function wordErrorRate(reference,hypothesis){return wordAlignment(reference,hypothesis).wer;}
export function estimate(text,distance,{noSignal=false,clipping=0}={}){
 if(noSignal)text='';const expected=expectedPhrase(distance),tokens=words(text),alignment=wordAlignment(expected,text),wer=alignment.wer;
 // Require exactly one measured-distance declaration; contradictory distances cannot pass.
 const numericWords='zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred';
 const declarations=[...String(text).toLowerCase().matchAll(new RegExp('\\b((?:[0-9]+|'+numericWords+')(?:[ -]+(?:'+numericWords+'))*)[ -]+(?:foot|feet)\\b','g'))].map(m=>m[1]);
 const correct=v=>v===names[distance]||v===String(distance);
 const protocolMismatch=declarations.length>1||declarations.some(v=>!correct(v));
 const distanceMatched=declarations.length===1&&correct(declarations[0]);
 const status=protocolMismatch?4:!noSignal&&tokens.length>0&&wer<=.2&&distanceMatched?1:2;
 return {version:ENGINE_VERSION,status,...alignment,score:protocolMismatch?null:Math.round((1+9*Math.max(0,1-wer))*10)/10,distanceMatched:distanceMatched?1:0,protocolMismatch:protocolMismatch?1:0,clippingWarning:Number.isFinite(clipping)&&clipping>=1?1:0};
}
export const uncertain=(clipping=0)=>({version:ENGINE_VERSION,status:3,wer:null,substitutions:null,deletions:null,insertions:null,referenceWords:null,score:null,protocolMismatch:0,distanceMatched:0,clippingWarning:clipping>=1?1:0});
export function estimateLabel(result){return !result?'Not analyzed':result.status===1?'Phrase recognized — estimate':result.status===2?'Phrase not reliably recognized':result.status===4?'Distance wording mismatch—repeat trial.':'Uncertain — analysis unavailable';}
export function automaticSummary(samples){const speech=samples.filter(s=>s.kind==='speech');return {farthest:Math.max(0,...speech.filter(s=>s.automatic?.status===1).map(s=>s.distance)),complete:DISTANCES.every(d=>speech.some(s=>s.distance===d&&[1,2,3,4].includes(s.automatic?.status)))};}

// Equal-weight mean requires every distance; absent or failed analysis is not a low score.
export function recognitionScore(samples){
 const trials=samples.filter(s=>s.kind==='speech');
 if(trials.length!==DISTANCES.length)return null;
 const scores=[];for(const distance of DISTANCES){const matches=trials.filter(s=>s.distance===distance);if(matches.length!==1)return null;const r=matches[0].automatic;if(!r||r.version!==ENGINE_VERSION||![1,2].includes(r.status)||!Number.isFinite(r.score)||r.score<1||r.score>10)return null;if(!Number.isFinite(r.wer)||r.wer<0)return null;scores.push(1+9*Math.max(0,1-r.wer));}
 return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10;
}
