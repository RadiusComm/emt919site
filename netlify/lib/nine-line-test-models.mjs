// Official inventories checked 2026-10-31. Sources/limits: scripts/nine-line-model-coverage.md.
// Labels are stable submission IDs; preserve existing labels when extending the catalog.
const list = text => text.split('|');
const galaxy = text => list(text).map(name => 'Galaxy '+name);
export const MODEL_GROUPS = {
  Apple:{
    '2026':list('iPhone Duo|iPhone 18 Pro Max|iPhone 18 Pro|iPhone 17e'),
    '2025':list('iPhone 17|iPhone 17 Pro|iPhone 17 Pro Max|iPhone Air|iPhone 16e'),
    '2024':list('iPhone 16|iPhone 16 Plus|iPhone 16 Pro|iPhone 16 Pro Max'),
    '2023':list('iPhone 15|iPhone 15 Plus|iPhone 15 Pro|iPhone 15 Pro Max'),
    '2022':list('iPhone 14|iPhone 14 Plus|iPhone 14 Pro|iPhone 14 Pro Max|iPhone SE (3rd generation)'),
    '2021':list('iPhone 13|iPhone 13 mini|iPhone 13 Pro|iPhone 13 Pro Max'),
    '2020':list('iPhone 12|iPhone 12 mini|iPhone 12 Pro|iPhone 12 Pro Max|iPhone SE (2nd generation)')
  },
  Samsung:{
    'Galaxy S / FE':galaxy('S26|S26+|S26 Ultra|S26 FE|S25|S25+|S25 Ultra|S25 Edge|S25 FE|S24|S24+|S24 Ultra|S24 FE|S23|S23+|S23 Ultra|S23 FE|S22|S22+|S22 Ultra|S21 5G|S21+ 5G|S21 Ultra 5G|S21 FE 5G|S20|S20 5G|S20+|S20+ 5G|S20 Ultra|S20 FE|S20 FE 5G|S10 Lite'),
    'Galaxy Note':galaxy('Note20|Note20 5G|Note20 Ultra 5G|Note10 Lite'),
    'Galaxy Z / Fold':galaxy('Z Flip8|Z Fold8|Z Fold8 Ultra|Z Flip7|Z Flip7 FE|Z Fold7|Z TriFold|Z Flip6|Z Fold6|Z Fold Special Edition|Z Flip5|Z Fold5|Z Flip4|Z Fold4|Z Flip3 5G|Z Fold3 5G|Z Flip|Z Flip 5G|Z Fold2|Z Fold2 5G'),
    'Galaxy A':galaxy('A08|A18|A07|A07 5G|A07s|A17|A17 5G|A27 5G|A37 5G|A57 5G|A06|A06 5G|A16|A16 5G|A26 5G|A36 5G|A56 5G|A05|A05s|A15|A15 5G|A25 5G|A25 5G (Japan)|A35 5G|A55 5G|A04|A04e|A04s|A14|A14 5G|A24|A34 5G|A54 5G|A03|A03s|A03 Core|A13|A13 5G|A23|A23 5G|A23e 5G|A33 5G|A53 5G|A73 5G|A02|A02s|A12|A22|A22 5G|A22e 5G|A32|A32 5G|A52|A52 5G|A52s 5G|A72|A82 5G|A01|A01 Core|A11|A21|A21s|A31|A41|A42 5G|A51|A51 5G|A71|A71 5G'),
    'Galaxy M':galaxy('M08|M07|M17 5G|M17e 5G|M47 5G|M06 5G|M16 5G|M36 5G|M56 5G|M05|M15 5G|M35 5G|M55 5G|M55s 5G|M04|M14|M14 5G|M34 5G|M44 5G|M54 5G|M13|M13 5G|M23 5G|M33 5G|M53 5G|M02|M02s|M12|M21 (2021)|M22|M32|M32 5G|M42 5G|M52 5G|M62|M01|M01 Core|M01s|M11|M21|M31|M31 Prime Edition|M31s|M21s|M51'),
    'Galaxy F':galaxy('F08|F07|F17 5G|F70 Pro 5G|F70e 5G|F06 5G|F16 5G|F36 5G|F56 5G|F05|F14|F15 5G|F55 5G|F04|F14 5G|F34 5G|F13|F12|F02s|F41|F22|F42 5G|F52 5G|F62'),
    'Galaxy XCover / C':galaxy('XCover7 Pro|XCover7|XCover6 Pro|XCover5|XCover Pro|C55 5G'),
    'Regional W':list('W26|W25|W25 Flip|W24|W24 Flip|W23|W23 Flip|W22 5G|W21 5G')
  },
  Google:{
    'Pixel 11 / 10':list('Pixel 11|Pixel 11 Pro|Pixel 11 Pro XL|Pixel 11 Pro Fold|Pixel 10|Pixel 10 Pro|Pixel 10 Pro XL|Pixel 10 Pro Fold|Pixel 10a'),
    'Pixel 9 / 8':list('Pixel 9|Pixel 9 Pro|Pixel 9 Pro XL|Pixel 9 Pro Fold|Pixel 9a|Pixel 8|Pixel 8 Pro|Pixel 8a'),
    'Pixel 7 / 6 / Fold':list('Pixel 7|Pixel 7 Pro|Pixel 7a|Pixel 6|Pixel 6 Pro|Pixel 6a|Pixel Fold'),
    'Pixel 5 / 4a':list('Pixel 5|Pixel 5a with 5G|Pixel 4a|Pixel 4a (5G)')
  },
  Motorola:{
    'Moto G - selected yearly models':list('moto g stylus - 2026|moto g power - 2026|moto g play - 2026|moto g - 2026|moto g stylus - 2025|moto g power - 2025|moto g - 2025|moto g stylus 5G - 2024|moto g 5G - 2024|moto g power 5G - 2024|moto g play - 2024|moto g power 5G (2023)|moto g play (2021)|moto g power (2020)'),
    'Moto G - selected global models':list('moto g96 5G|moto g87|moto g86 power 5G|moto g86 5G|moto g85 5G|moto g84 5G|moto g75 5G|moto g73 5G|moto g64 5G|moto g56 5G|moto g55 5G|moto g54 5G|moto g53 5G|moto g45 5G|moto g35 5G|moto g34 5G|moto g24 power|moto g24|moto g15 power|moto g15'),
    'Razr - selected models':list('motorola razr - 2026')
  },
  OnePlus:{
    'Number / Open':list('OnePlus 15|OnePlus 15R|OnePlus 13|OnePlus 13R|OnePlus 12|OnePlus 12R|OnePlus Open|OnePlus 11|OnePlus 10T|OnePlus 10 Pro|OnePlus 9|OnePlus 9 Pro|OnePlus 8T|OnePlus 8|OnePlus 8 Pro'),
    'Nord':list('OnePlus Nord 5|OnePlus Nord CE5|OnePlus Nord 4|OnePlus Nord CE 4 Lite|OnePlus Nord 3|OnePlus Nord CE 3 Lite|OnePlus Nord 2T|OnePlus Nord CE 2|OnePlus Nord CE 2 Lite|OnePlus Nord 2|OnePlus Nord CE|OnePlus Nord')
  },
  'Other Android':{},Other:{}
};
export const MODELS = Object.fromEntries(Object.entries(MODEL_GROUPS).map(([make,groups])=>[make,Object.values(groups).flat()]));
// Reserved synthetic fixture is QA only, excluded from real device analysis.
export const sharedModels = [...Object.entries(MODELS).flatMap(([make,models])=>[...models.map(model=>make+' / '+model),make+' / Other']),'Test fixture / Synthetic'];
export function matchingModelGroups(make,query='') {
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return Object.entries(MODEL_GROUPS[make]||{}).map(([group,models])=>[group,models.filter(model=>terms.every(term=>model.toLowerCase().includes(term)))]).filter(([,models])=>models.length);
}
// UI default only, manually overridable; no user-agent detection or guessed OS version.
export function defaultOperatingSystem(make,model) {
  if(make==='Other Android')return 'Android';
  if(model==='Other'||(model&&!MODELS[make]?.includes(model)))return '';
  if(make==='Apple')return 'iOS';
  return ['Samsung','Google','Motorola','OnePlus'].includes(make)?'Android':'';
}
