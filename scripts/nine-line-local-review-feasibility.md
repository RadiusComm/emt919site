# Local automatic review — feasibility checkpoint, not implementation

The current tone/bar candidate has no automatic speech recognition. Manual ratings and amplitude metrics must not be presented as completing the new automatic-review request.

## Bounded local option

Use a pinned Transformers.js/ONNX Runtime Web worker to transcribe each completed 10-second clip entirely on the phone, then compare the normalized words with that distance's expected phrase using word-error edit distance. Decode/resample only in memory to 16kHz mono. Never pass the expected phrase as a recognizer prompt/context; compare only after independent transcription. Do not use browser SpeechRecognition or fall back to any cloud service.

Label the output an **automatic word-match / intelligibility estimate**, with transcript and match percentage visible locally. Phrase match is not a validated human-intelligibility or native 9/Line compatibility guarantee. Silence, hallucinated/repetitive output, empty transcript, unsupported runtime, download/decode/inference errors and timeout need explicit negative/unavailable/uncertain states; they must never become an automatic clear pass. Any green/amber/red mapping would be a disclosed heuristic requiring validation, not an invented operational threshold. Human listening can remain an optional check, but cannot substitute for the requested automatic feature.

## Verified resource evidence

- Official Transformers.js WebGPU guide supports browser Whisper ASR and notes browser/version-dependent support and backend issues: https://huggingface.co/docs/transformers.js/guides/webgpu
- Official current pipeline documentation identifies stable v3.8.1 separately from its main branch: https://huggingface.co/docs/transformers.js/en/pipelines
- Model publisher inventory for `onnx-community/whisper-tiny.en` lists quantized encoder 10.1 MB and merged quantized decoder 30.7 MB: https://huggingface.co/onnx-community/whisper-tiny.en/tree/main/onnx . The selected weight pair is therefore about **40.8 MB**, plus tokenizer/config, application/ONNX runtime and WASM files. This is not a measured complete browser download or peak memory figure.
- Model variants differ significantly: the separate `whisper-tiny.en-ONNX` repository lists a 110 MB merged quantized decoder. Do not interchange names or promise a footprint without pinning/checking exact files: https://huggingface.co/onnx-community/whisper-tiny.en-ONNX/tree/main/onnx
- Runtime deployment guidance requires matching JS/WASM versions and CSP-aware deployment: https://onnxruntime.ai/docs/tutorials/web/deploy.html

Proposed first backend: single-thread WASM in a worker for a broader baseline, optional WebGPU only after capability checks and validation. Avoid requiring cross-origin isolation or browser experimental flags. Download time, peak memory, battery use and per-clip latency on iPhone/Samsung/Pixel remain **unmeasured**. No blanket mobile support claim is justified yet.

## Packaging/privacy implications to review

Prefer pinned self-hosted runtime/model assets, explicit first-use model download with progress and cancellation, and browser model cache only (never cached audio/transcripts). A scoped tester CSP adjustment for WASM compilation/worker execution may be necessary; never use broad unsafe-eval or weaken unrelated site policies. Self-hosting needs a verified build/download or asset-packaging step; it is not present in this intermediate patch.

Raw recordings, PCM and transcripts stay in memory on the device and are deleted with the session. Existing Submit still sends model/summary only. Automatic-versus-human provenance must not be misrepresented in stored results; review how to distinguish estimates while preserving the approved schema/semantics before enabling automatic summary submission. No paid service, new credentials, backend audio endpoint or server retention is proposed.

Next bounded work: pin/license/hash exact runtime/model assets; exercise genuine local inference on synthetic non-customer phrases/noise/silence; measure complete download/memory/time; prototype cancellation and unavailability; validate phone browsers and summary semantics; then return an exact implementation candidate for independent review. Until those checks pass, automatic clarity is **not implemented or validated**. If local execution is impractical, report that result and request explicit destination/data/retention consent before proposing server processing.
