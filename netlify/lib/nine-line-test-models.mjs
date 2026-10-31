// Starter labels checked against official manufacturer pages on 2026-10-31.
export const MODELS = {
  Apple:['iPhone 17','iPhone 17 Pro','iPhone 17 Pro Max','iPhone Air','iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max','iPhone 16e','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 13','iPhone 13 mini','iPhone 13 Pro','iPhone 13 Pro Max','iPhone SE (3rd generation)','iPhone 12'],
  Samsung:['Galaxy S25','Galaxy S25+','Galaxy S25 Ultra','Galaxy S24','Galaxy S24+','Galaxy S24 Ultra','Galaxy S23','Galaxy S23 Ultra','Galaxy S22','Galaxy S22 Ultra'],
  Google:['Pixel 10'],'Other Android':[],Other:[]
};
// Reserved fixture is used only by deployment QA, and is excluded from device analysis.
export const sharedModels = [...Object.entries(MODELS).flatMap(([make,models])=>[...models.map(model=>make+' / '+model),make+' / Other']),'Test fixture / Synthetic'];

