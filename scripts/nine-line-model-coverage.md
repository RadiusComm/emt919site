# Phone catalog evidence

Checked 2026-10-31. This is a selection catalog, not evidence of microphone performance, popularity rank, native Nine Line compatibility or ongoing OS support. Exact labels are stable backend IDs; earlier labels and Other categories remain valid. No previously stored records are changed.

| Make | Named choices | Scope |
| --- | ---: | --- |
| Apple | 31 | Official identification page entries introduced 2020–2026, including SE/mini/Plus/Pro/Max/Air/Duo. Excludes pre-2020 phones. |
| Samsung | 209 | Broad 2020 onward Galaxy S/FE/Lite, Note, Z, A, M, F, XCover, C and regional W inventory. Not an exhaustive worldwide list of carrier codes, regional aliases, Tactical editions, colors or storage variants. |
| Google | 28 | Official supported and expired-support Pixel list from Pixel 4a (2020) through the currently listed Pixel 11 family. Excludes Pixel 4/4 XL (2019). |
| Motorola | 35 | Bounded selection: Moto G 2020/2021/2023 and 2024–2026 US yearly variants, selected global G models and Razr 2026. Not a complete Motorola catalog or all years/families. |
| OnePlus | 27 | Smartphone entries in the UK official security-period list from OnePlus 8/Nord (2020) through 15/15R/Nord 5. Not all China/India/N-series variants. |

## Primary sources

- Apple: https://support.apple.com/en-us/108044 — exact model labels and year introduced. The live page lists iPhone Duo, 18 Pro/Max and 17e under 2026; no unlisted base iPhone 18 is inferred.
- Samsung Knox: https://www.samsungknox.com/en/knox-platform/supported-devices — official supported-device table, last updated October 16, 2026; read hydrated browser table (557 rows across all device types). Curated smartphone families only, excluding older S10/Note10 originals and tablets/watches. S10 Lite and Note10 Lite are retained as 2020 releases.
- Samsung current security scope: https://security.samsungmobile.com/workScope.smsb — cross-check of current smartphone labels, including S26/FE, Z8, A/M/F current entries. This catalog does not imply any update promise.
- Samsung 2020 US A series: https://news.samsung.com/us/galaxy-a-series-a11-a21-a51-a71-galaxy-for-everyone
- Samsung M01 Core/M01s: https://news.samsung.com/in/samsung-makes-smartphone-accessible-for-bharat-launches-galaxy-m01-core-at-inr-5499
- Samsung M02/M02s: https://news.samsung.com/in/samsung-launches-entry-level-galaxy-m02-smartphone-in-india-with-5000mah-battery-and-large-screen-introductory-price-of-inr-6799-on-amazon-in
- Samsung M21s: https://news.samsung.com/br/samsung-apresenta-galaxy-m21s-e-galaxy-m51-com-mega-bateria-no-brasil — November 5, 2020.
- Samsung M31 Prime Edition: https://news.samsung.com/in/category/press-resources/press-release/page/80 — October 14, 2020 announcement index; also https://news.samsung.com/in/samsung-india-announces-mega-offers-on-wide-range-of-smartphones-home-appliances-on-samsung-com-your-best-shopping-destination-this-festive-season
- Samsung F02s: https://news.samsung.com/in/samsung-india-launches-fullonfab-galaxy-f12-with-true-48mp-quad-camera-and-90hz-display — 2021.
- Samsung F41: https://news.samsung.com/in/samsung-launches-galaxy-f41-in-india-the-fullon-smartphone-for-young-shoppers-this-festive-season — October 8, 2020.
- Google: https://support.google.com/pixelphone/answer/4457705?hl=en — current/expired device lists; no Pixel tablets included. Google availability dates: linked hardware specification page from that source.
- Motorola: https://en-us.support.motorola.com/app/software-security-update/g_id/7112 — Select your product → moto g family, browser-visible exact names. Only a bounded subset chosen; no inferred name sequences.
- Motorola older G examples: https://en-us.support.motorola.com/app/product_page/faqs/page/579/page/149 — official FAQ entries explicitly identify moto g power (2020), moto g play (2021), moto g power 5G (2023).
- Motorola Razr 2026: https://www.motorola.com/us/en/p/phones/razr/razr-2026/pmipmjl44m7
- OnePlus: https://www.oneplus.com/uk/psti — official product security-period smartphone table (search-indexed hydrated table); accessories and tablets excluded. Labels preserve its CE spacing. Support end dates do not represent microphone test outcomes.

## Validation and release dependency

Frontend and dedicated Netlify receiver catalogs must be identical. The upstream private Sites receiver imports its own `dist/models.js`: copy this exact catalog there, rebuild, test and deploy its expanded allowlist before publishing the canonical selector. Keep consent, payload keys/ranges, no-login flow, fixed destination, rate limits, read protection and database schema unchanged. No raw audio, notes, OS version or identifiers are added to submissions.

Other remains available for missing models. A custom model text field appears only when the selected make is Other. The free-text manual entry remains browser-local; the backend receives the existing make / Other category, never arbitrary free text. The native model dropdown shows the full catalog grouped by family or iPhone introduction year; there is no model search field. Explicit OS overrides remain available. Make/model changes still clear stale OS versions.
