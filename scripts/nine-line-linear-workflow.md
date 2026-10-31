# Linear microphone workflow repair

Requested behavior: one current recording task, rather than independent distance buttons.

1. Baseline: explicit Start, permission and audio setup, then 5 seconds of quiet capture. Automatic stop, track cleanup, Baseline recorded.
2. Speech: manually Start each next step at 2, 6, 10, 15 and 20 feet. The distance and short script are shown before Start. Permission/setup finish before preparation begins. Default preparation is 5 / 10 / 10 / 20 / 20 seconds respectively, with a 5/10/20 selector. These defaults are implementation choices. No MediaRecorder or analyser sampling runs during preparation. The microphone track is open for permission/setup and clearly labeled as ready but not recording.
3. Preparation ends, then 10 seconds of actual capture starts from MediaRecorder's start event. Visible preparation/recording countdowns use different wording. Automatic stop and track cleanup; the next stage requires another explicit Start.
4. After all six captures, show playback and self-reported clarity review, then optional consented Submit results. No amplitude-only intelligibility or hardware compatibility pass.

The quoted script substitutes the measured distance only: “This is the six-foot test. The plane flies west. I can hear every word clearly.” Its label says words to read, not a clarity result. No speech recognition or synthesized prompts/tones are used.

Completion requires encoded data, sustained finite analyser samples and a complete capture window. A speech recording with only near-digital silence fails the signal check and remains on the same step. This cannot establish that speech occurred or was intelligible; human listening is still required. Quiet digital silence is allowed for the baseline. Failed/current-step attempts do not remove earlier steps.

Capture targets are 5 and 10 seconds. Browser timers are not a calibrated audio clock; permission/setup and walk time are excluded, event-loop overruns/gaps greater than the allowed tolerance fail rather than count as complete. Real device timing/audio behavior still requires owner testing. Cancellation, hidden page, disconnect, audio interruption, reset, late permission/resume and navigation clean resources and prevent stale transitions.

No changes to model catalog, backend payload/schema, allowlists, receiver, forms, CRM or security settings. Records/audio remain memory-only; no login or audio upload. Custom model text appears only for make Other. Existing summary submission remains explicit and sends only model plus metrics/manual rating.

Validation command: `node --test scripts/nine-line-test-*.test.mjs scripts/demo-officers.test.mjs`. Synthetic mock timers/audio exercise the complete six-stage flow, exact capture windows after setup, preparation choices, failures/retries, silence/invalid data, repeated clicks, cancellation/late async events, interruption/navigation cleanup, clarity and summary privacy. Hosted mobile layout QA supplements these tests; this is not iOS/Android hardware QA.
