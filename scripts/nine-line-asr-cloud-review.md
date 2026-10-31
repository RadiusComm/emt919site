# Local automatic scoring preview (not production-ready ingestion)

Base: 4e0e0dd3de2796fee567351610658cb02902093a (spoken cues/wake lock); PR19/20 branches untouched.

## Browser evidence, 2026-10-31
Actual Chromium WASM worker inference, self-hosted Transformers.js 3.8.1 and pinned whisper-tiny.en q8, no reference phrase/prompt in generation. Synthetic FLITE speech fixtures only:
- six.wav: recognized six-foot phrase exactly, WER 0, distance matched, status 1; 2054 ms.
- wrong.wav: transcribed twenty-foot phrase, evaluated against six: WER .0625, distance mismatch, status 2; 1870 ms.
- unrelated.wav: unrelated phrase, WER .9375, status 2; 1759 ms.
- Silence and seeded noise fixtures: both status 2, WER 1, distance unmatched. Silence hallucinated a word but did not become a pass.
- Final load plus five inferences: 9410 ms on cloud Chromium. Not a phone performance promise.
- Real browser cancellation displayed 'Local analysis cancelled'; interface Enable→ready→unload restored usable controls.

## Verification
75 applicable Node tests pass (47 existing + 7 ASR + 12 contract + 9 UI); syntax checks pass. Additional review harness separately passes six cue interruption tests. Independent code review caught stale control states and cancel→immediate worker reload race; both fixed and replacement-worker regression added.

## Build / privacy
`python3 scripts/fetch-asr-assets.py` retrieves pinned publicly licensed assets and verifies archive/file SHA-256, failing closed if unavailable or mismatched. This happens during Netlify build; browser fetches only self-hosted assets. About 66.1 MB model/runtime assets, opt-in download, model-only browser cache. PCM/transcript/recordings stay in memory; worker terminated on cancel/hidden/navigation. No hidden recording or server ASR. CSP adds only scoped wasm-unsafe-eval and same-origin workers; no broad unsafe-eval or CDN.

## Interpretation
Automatic policy 1: normalized word error rate <=.2 AND exactly one correct measured-distance phrase. A heuristic estimate, not certified intelligibility, compatibility or usable range. Clipping >=1% is separate warning. Unavailable/error states are uncertain, not passes. Maximum recognized distance uses actual trial outcomes and never fills gaps. Human ratings remain separate.

## Remaining gate
Automatic summary uploads remain disabled. Version-2 client/proxy contract proposal and strict tests are present; actual upstream Sites source/schema must be inspected and coordinated before enabling. Existing manual submission schema/proxy untouched. No production merge or deployment authorized here. Physical iPhone/Android microphone/model memory/battery tests remain required.
