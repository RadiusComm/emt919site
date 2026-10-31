import test from 'node:test';import assert from 'node:assert/strict';
import {MODELS,MODEL_GROUPS,sharedModels,matchingModelGroups,defaultOperatingSystem} from '../nine-line-system-test-assets/models.js';
import {sharedModels as serverModels} from '../netlify/lib/nine-line-test-models.mjs';
import {validate} from '../netlify/lib/nine-line-test-validation.mjs';
test('catalog choices are unique and server allowlist matches every frontend ID',()=>{
  assert.deepEqual(sharedModels,serverModels);assert.equal(new Set(sharedModels).size,sharedModels.length);
  for(const [make,models] of Object.entries(MODELS)){assert.equal(new Set(models).size,models.length);for(const model of models)assert.ok(validate({consent:true,model:make+' / '+model,results:[{distance:6,rms:-20,peak:-10,clipping:0,rating:'unreviewed'}]}));}
  assert.equal(MODELS.Apple.length,31);assert.ok(MODELS.Samsung.length>190);assert.equal(MODELS.Google.length,28);
});
test('2020 families and verified current entries exist without pre-2020 tablet/watch leakage',()=>{
  for(const model of ['iPhone SE (2nd generation)','iPhone 12 mini','iPhone 12 Pro Max','iPhone Duo','iPhone 18 Pro','iPhone 17e'])assert.ok(MODELS.Apple.includes(model));
  for(const model of ['Galaxy S10 Lite','Galaxy Note10 Lite','Galaxy S20','Galaxy Z Flip','Galaxy A01','Galaxy M01 Core','Galaxy F41','Galaxy XCover Pro','Galaxy S26','Galaxy Z Fold8 Ultra','Galaxy A57 5G'])assert.ok(MODELS.Samsung.includes(model));
  assert.ok(!MODELS.Samsung.some(m=>/Tab|Watch|^Galaxy S10$|^Galaxy Note10$/.test(m)));assert.ok(!MODELS.Google.includes('Pixel 4'));
  assert.deepEqual(Object.keys(MODEL_GROUPS.Apple).sort(),['2020','2021','2022','2023','2024','2025','2026']);
});
test('all prior labels and Other categories remain valid stable submission IDs',()=>{
  const oldApple=['iPhone 17','iPhone 17 Pro','iPhone 17 Pro Max','iPhone Air','iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max','iPhone 16e','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 13','iPhone 13 mini','iPhone 13 Pro','iPhone 13 Pro Max','iPhone SE (3rd generation)','iPhone 12'];
  for(const m of oldApple)assert.ok(sharedModels.includes('Apple / '+m));
  for(const m of ['Galaxy S25','Galaxy S25+','Galaxy S25 Ultra','Galaxy S24','Galaxy S24+','Galaxy S24 Ultra','Galaxy S23','Galaxy S23 Ultra','Galaxy S22','Galaxy S22 Ultra'])assert.ok(sharedModels.includes('Samsung / '+m));
  for(const id of ['Google / Pixel 10','Apple / Other','Samsung / Other','Google / Other','Other Android / Other','Other / Other','Test fixture / Synthetic'])assert.ok(sharedModels.includes(id));
  assert.equal(validate({consent:true,model:'Motorola / made up',results:[{distance:6,rms:-20,peak:-10,clipping:0,rating:'clear'}]}),false);
});
test('search narrows model/family words without inventing names; new Android makes default correctly',()=>{
  assert.deepEqual(matchingModelGroups('Apple','12 mini').flatMap(([,models])=>models),['iPhone 12 mini']);
  assert.deepEqual(matchingModelGroups('Samsung','s20 fe').flatMap(([,models])=>models),['Galaxy S20 FE','Galaxy S20 FE 5G']);
  assert.deepEqual(matchingModelGroups('Samsung','not a phone'),[]);assert.deepEqual(matchingModelGroups('unknown'),[]);
  for(const make of ['Motorola','OnePlus','Google','Samsung']){assert.equal(defaultOperatingSystem(make,MODELS[make][0]),'Android');assert.equal(defaultOperatingSystem(make,'Other'),'');}
});
