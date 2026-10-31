# Automatic numeric-summary v2 — coordinated rollout proposal

**Status: local proposal only. Automatic forwarding is disabled.** Existing runtime
manual client/proxy/receiver are not modified by these proposal files. No upstream
schema mutation, deploy, POST, repository write or credential request was performed.

## Verified existing contract

- Repository: `RadiusComm/emt919site`, inspected base `4e0e0dd3de2796fee567351610658cb02902093a`.
- Existing exact manual envelope: `{consent:true,model,results:[{distance,rms,peak,clipping,rating}]}`.
- Model is the existing fixed shared-model allowlist ID; manual rating values are unchanged.
- Proxy: same-origin POST JSON only, 12,000-byte streamed/declared limit,
  10-second upstream timeout, 10 requests/minute infrastructure limit, fixed upstream
  `https://covert-mode-tester-nineline-20261031.zanzee.chatgpt.site/api/results`.
- Explicit receipt requires HTTP 201 and `message:"Result stored privately."`;
  audio, transcripts, notes, identity, cookies and credentials are not forwarded.
- Sites metadata confirms project `appgprj_6ae612efa4b48191b5503f9e8eee2164`,
  latest version 5, source `8383c05760604bb66d2dbd5ef03947506b3c31aa`.

## Proposed automatic envelope

```json
{"consent":true,"model":"Test fixture / Synthetic","version":2,"results":[{"distance":6,"rms":-20,"peak":-10,"clipping":0,"automatic":{"version":1,"status":1,"wer":0.1,"distanceMatched":1,"clippingWarning":0}}]}
```

Only the preexisting model identifier is a free string; every automatic field is
numeric or null. There are no transcript fragments, recognized distance text,
notes, audio, timestamps, session IDs, device versions or request identifiers.

`automatic.version=1` fixes the ASR/runtime/model revision and scoring policy
recorded by the asset manifest. Policy version must increment if these semantics
change. The server accepts this exact version, not arbitrary model/provider names.

- `status=1`: recognized estimate, `wer <= 0.2` and `distanceMatched=1`.
- `status=2`: not recognized estimate; at least one recognition condition fails.
- `status=3`: uncertain/unavailable, `wer=null` and `distanceMatched=0`.
- `wer`: word-error ratio, 0..10; never a calibrated clarity/confidence percentage.
- `distanceMatched`: 0 or 1, computed from exactly one correct distance mention.
- `clippingWarning`: 1 iff the independent measured clipping percentage is >=1.
  Clipping does not alter the recognized-status policy.
- Distances: unique members of 2/6/10/15/20; 1..5 results accepted by the server,
  but the client serializer requires all five trials, each explicitly analyzed.
- No-signal: client policy short-circuits to status 2, WER 1, distanceMatched 0;
  it must not let ASR hallucination create a recognized result from silence.

There is no human `rating` field in automatic v2. Existing manual submissions stay
unversioned and unchanged; automatic results must never populate a manual rating
column or be combined with human clarity results without explicit provenance.

## Files and local validation

- `../netlify/lib/nine-line-auto-validation.mjs`: strict exact-key validation and projection.
- `client-automatic-payload.mjs`: pure projection, with `AUTOMATIC_SUBMISSION_ENABLED=false`.
- `proxy-v2.mjs`: proposed complete proxy, default `automaticEnabled=false`.
  Its import paths are intentionally relative to this proposal directory; adjust
  them when reviewed changes move into the actual function directory.
- `../scripts/nine-line-auto-contract.test.mjs`: 12 tests covering disjoint schemas,
  provenance, strict privacy projection, numeric consistency, legacy operation,
  default-off gate, versioned receipt and existing request guards.

Run `node --test scripts/nine-line-auto-contract.test.mjs` from the candidate root.

## Required upstream work — blocked pending readable actual source

The available Sites archived source was located, but `download_file` returned
`file could not be authorized or resolved`. No alternate credential or transport
was attempted. Consequently actual D1 column definitions and the live admission
transaction have **not** been inspected; there is deliberately no guessed SQL
ALTER statement or purported deployable upstream patch here.

Smallest next input: provide the source for the current Sites `/api/results`
handler and `result_summaries` schema/migrations, or permit an official supported
source checkout. Preserve version 5 as the review base and inspect any newer head.

Once accessible, the exact upstream patch must:

1. Keep manual validation, manual insert and old receipt byte-shape unchanged.
2. Accept automatic only through the same fixed route and existing origin/content/
   body-size/rate/admission rules, using the identical strict numeric validator.
3. Add backward-compatible explicit provenance storage. Depending on inspected
   schema, add nullable automatic metadata/JSON plus a default-manual schema version,
   or a separate automatic table tied into the **same** atomic admission counters.
   Do not duplicate/reset the existing 500/day or 10,000-total collection limits.
4. Reconstruct and bind only allowed fields; no request/body logging, no public
   read route, and no storing connection information. Keep parameterized D1 writes.
5. Commit admission + result storage atomically. A rejected/failed/limited insert
   cannot return success. Emit `{message:"Result stored privately.",version:2}`
   only after confirmed automatic persistence. Old receipts cannot satisfy v2.
6. Test legacy and v2 happy paths, unknown versions/models/private fields, oversized
   streaming bodies, GET/OPTIONS denial, false receipts, transaction rollback,
   concurrency at quotas, and no transcript/audio in persisted columns.

## Ordered enablement / rollback

1. Review actual upstream schema patch and migration; dry-run against a temporary
   local D1 database with both legacy rows and synthetic v2 rows.
2. Obtain the owner's required deployment authorization and independently review.
3. Deploy additive upstream support first. Verify an approved synthetic category
   submission/receipt and owner-only stored projection; do not use customer audio.
4. Deploy reviewed proxy with automatic enabled only after step 3 is established.
   Default-disabled proxy returns 503 without contacting upstream for automatic data.
5. Enable the explicit client consent/button only after compatible proxy/upstream
   are verified. Never auto-submit on Analyze or silently fall back to manual rating.
6. Roll back by disabling automatic client/proxy first. Preserve automatic rows with
   their provenance; do not drop migrated columns or relabel results as manual.

Both recognized estimates and maximum recognized distance remain experimental
ASR matches, not certified hardware range, guaranteed intelligibility, or 9/Line
native-pipeline compatibility.
