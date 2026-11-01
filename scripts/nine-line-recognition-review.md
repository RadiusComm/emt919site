# Word-recognition policy 2 (candidate, not production)

Scope: user-started local Whisper tiny.en recognition, 5/10/20-foot fixed 16-word phrase, no expected-phrase prompt. Same-origin pinned model/runtime 66,133,920 bytes; preparation only on Start or explicit retry. No recordings/transcripts sent or persisted. Browser may cache model files; transient decoded buffers are garbage-collected, not claimed instantly erased.

Each completed trial uses deterministic Levenshtein S/D/I, WER=(S+D+I)/16. Trial score=1+9*max(0,1-WER). Overall is the equal mean of unrounded trial scores, rounded once to one decimal; all three trials required. Missing/unrecognized distance gets ordinary word errors and a warning. Explicit contradictory/multiple distance declarations are protocol mismatch and require repeat (could be user or recognition error), not a low phone-quality score. Silent capture/empty successful output scores1; runtime/model/decode failures are unavailable, never1.

Very-low-signal guard suppresses recognizer hallucination when sampled peak<=-80dBFS. It cannot reliably distinguish arbitrary noise, speech or hallucinations; word recognition is not guaranteed human intelligibility or audio quality. Clipping and volume remain independent diagnostics.

Existing volume-score policy1 remains isolated and labelled legacy; records are not rescored. New schema4/policy2 contract accepts only fixed model and validated numeric completed recognition metrics with explicit public consent. New proxy/client stays disabled pending reviewed receiver rollout. No audio/text/rawPCM, user identity, notes or tracking identifiers.

Lifecycle: user gesture resumes output before async loading; no mic until model ready. Busy controls block overlapping captures/analysis. Capture remains outside cues with500ms settle. Hide/Cancel/Delete invalidate late results and terminate worker; late decode cannot commit. Final analysis keeps Cancel visible; model failure is retryable.

Verification: local unit/integration tests plus reviewed pinned assets. Fresh actual-browser inference remains a required gate; current cloud browser cannot reach local preview and a local Chromium process cannot open sockets under this environment. Historical earlier inference does not prove this candidate. No production publication without review and user authorization.
