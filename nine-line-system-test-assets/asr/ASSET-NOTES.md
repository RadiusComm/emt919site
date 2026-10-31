# Pinned local speech-recognition assets

Downloaded and SHA-256 verified 2026-10-31. This establishes asset integrity, not successful browser inference.

- Transformers.js `3.8.1` bundled browser module, from the exact npm tarball. Do not substitute `transformers.web.min.js`, which has bare ONNX imports.
- Matching bundled ONNX Runtime Web `1.22.0-dev.20250409-89f8206ba4` JSEP WASM/MJS.
- `onnx-community/whisper-tiny.en` immutable revision `2575352d61be1bf7225cf8f8b268a4678025fc58`, q8 encoder and merged decoder.
- All assets and license notices total **66,133,920 bytes**. The two ONNX weights total **40,843,851 bytes**; tokenizer/configuration files add about 2.75 MB. Runtime WASM is **21,596,019 bytes**. This is not peak RAM usage.

`assets-manifest.json` records every source URL, byte size and SHA-256, including the npm archive hash. `python scripts/fetch-asr-assets.py` recreates/verifies the assets without dependencies and fails on any mismatch. No audio input is accessed by that script.

Recommended module-worker configuration (before constructing the pipeline):

```js
import { env, pipeline } from './vendor/transformers.min.js';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/nine-line-system-test-assets/asr/models/';
env.backends.onnx.wasm.wasmPaths = '/nine-line-system-test-assets/asr/vendor/';
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
const recognizer = await pipeline('automatic-speech-recognition', 'whisper-tiny.en', {
  device: 'wasm', dtype: 'q8', local_files_only: true, progress_callback,
});
const result = await recognizer(pcm16000Hz, { max_new_tokens: 96, do_sample: false });
```

Do not pass expected script text, prompt IDs, or vocabulary hints to recognition. Reference text belongs only in subsequent scoring. Terminate the owning worker on cancellation to interrupt inference and release its memory; stale completion must not affect a newer trial. The worker and browser must never POST audio or transcript. Default browser model cache can contain these public assets only; never user data.

Serve all paths on the same origin. The tester page needs narrowly scoped `script-src 'self' 'wasm-unsafe-eval'` and `worker-src 'self'`; keep `connect-src 'self'`. No broad `unsafe-eval`, remote inference endpoint, remote model fallback, or cross-origin isolation is needed for this single-thread configuration.

Primary references:
- https://huggingface.co/docs/transformers.js/v3.8.1/en/custom_usage
- https://huggingface.co/docs/transformers.js/v3.8.1/en/api/env
- https://huggingface.co/docs/transformers.js/v3.8.1/en/api/pipelines
- https://huggingface.co/onnx-community/whisper-tiny.en/tree/2575352d61be1bf7225cf8f8b268a4678025fc58
- https://huggingface.co/openai/whisper-tiny.en/blob/main/README.md (model card declares Apache-2.0; original Whisper code license is MIT and also retained)

Runtime license notices are in `vendor/`; original Whisper code license and ONNX conversion README are in `models/whisper-tiny.en/`.
