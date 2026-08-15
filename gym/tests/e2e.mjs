import { chromium } from 'playwright';
const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',async route=>{
 const u=route.request().url(),method=route.request().method();let body={ok:true};
 if(u.includes('/food-lookup'))body=method==='GET'?{ok:true,source:'Open Food Facts v3'}:{ok:true,code:'12345678',name:'Test Protein Yogurt',brands:'Test',quantity:'200 g',servingQuantity:200,per100:{calories:100,protein:10,carbs:5,fat:2},source:'Open Food Facts'};
 else if(u.includes('/cloud-memory'))body=method==='GET'?{ok:true,version:4,conflictDetection:true}:{ok:true,state:null,updatedAt:null};
 else if(u.includes('/ai-key-setup'))body=method==='GET'?{ok:true,mode:'free-only',oauth:'pkce',originLocked:true}:{ok:true,configured:false,provider:'openrouter',freeOnly:true};
 else if(u.includes('/coach'))body={ok:true,freeOnly:true,model:'openrouter/free',originLocked:true};
 else if(u.includes('/push-subscribe'))body={ok:true,subscribed:false,originLocked:true};
 else if(u.includes('/push-dispatch'))body={ok:true,subscriptions:0,sent:0};
 else if(u.includes('/privacy-control'))body=method==='GET'?{ok:true,version:1}:{ok:true,memory:false,push:false,quota:false,ai:false};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const domClick=selector=>page.locator(selector).evaluate(el=>el.click());
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.waitForSelector('body.ready',{timeout:30000});
await page.waitForSelector('#screen-home.active',{timeout:10000});
if(await page.locator('#onboardDialog[open]').count())await page.locator('#obBack').click();

const dock=await page.evaluate(()=>{const d=document.querySelector('.dock'),items=[...document.querySelectorAll('.dock-item')].map(x=>{const r=x.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,label:x.querySelector('b')?.textContent||''}}),r=d.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,count:items.length,items,viewport:innerWidth,columns:getComputedStyle(d).gridTemplateColumns}});
if(dock.count!==5)throw new Error('Dock must have five items: '+JSON.stringify(dock));
if(dock.left<0||dock.right>dock.viewport)throw new Error('Dock overflows viewport: '+JSON.stringify(dock));
if(dock.items.some(x=>x.left<0||x.right>dock.viewport||x.width<45))throw new Error('Dock item clipped or too narrow: '+JSON.stringify(dock));

await domClick('[data-screen="fuel"]');
await page.waitForSelector('#screen-fuel.active');
await page.waitForSelector('#dgBarcodeFood');
await domClick('#dgBarcodeFood');
await page.waitForSelector('#mealDialog[open]');
await page.locator('#dgBarcodeManual').fill('12345678');
await domClick('#dgFoodLookupBtn');
await page.waitForSelector('#dgFoodAmount',{timeout:10000});
await page.locator('#dgFoodAmount').fill('150');
await domClick('#dgAddScannedFood');
await page.waitForFunction(()=>!document.querySelector('#mealDialog')?.open);
const scanned=await page.evaluate(()=>S.meals.find(x=>x.barcode==='12345678'));
if(!scanned||scanned.calories!==150||scanned.protein!==15)throw new Error('Barcode macro calculation failed: '+JSON.stringify(scanned));

await domClick('[data-screen="more"]');
await page.waitForSelector('#screen-more.active');
await page.waitForSelector('#dgPrivacyV73',{timeout:10000});
await page.waitForSelector('#dgLaunchChecklist',{timeout:10000});
await page.waitForSelector('#dgThemeCard',{timeout:10000});
const checklistText=await page.locator('#dgLaunchChecklist').innerText();
if(!checklistText.includes('Launch Checklist'))throw new Error('Launch Checklist missing from bundled app');
const initialTheme=await page.evaluate(()=>document.documentElement.dataset.dgTheme);
if(initialTheme!=='bright')throw new Error('Bright theme should be default for new install: '+initialTheme);
await domClick('.dg-theme-option[data-theme="night"]');
if(await page.evaluate(()=>document.documentElement.dataset.dgTheme)!=='night')throw new Error('Night theme switch failed');
await domClick('.dg-theme-option[data-theme="bright"]');
if(await page.evaluate(()=>document.documentElement.dataset.dgTheme)!=='bright')throw new Error('Bright theme switch failed');

await domClick('#profileBtn');
await page.waitForSelector('#profileDialog[open]');
await domClick('#profileDialog .close');
await domClick('[data-screen="home"]');
await page.waitForSelector('#screen-home.active');
await domClick('#buildToday');
await page.waitForSelector('#workoutDialog[open]',{timeout:15000});
await page.waitForSelector('#dgSmartSetBrief',{timeout:5000});
await page.waitForSelector('#dgTechniqueCheck',{timeout:5000});
const techText=await page.locator('#dgTechniqueCheck').innerText();
if(!techText.includes('בדיקת טכניקה'))throw new Error('Technique Snapshot entrypoint missing');
if(await page.locator('#swapExercise').count()){await domClick('#swapExercise');await page.waitForSelector('#machineDialog[open]');await page.waitForSelector('.dg-swap-option');await domClick('#dgSwapClose');}

const logic=await page.evaluate(()=>{
 const backup=JSON.parse(JSON.stringify(S)),now=Date.now();
 try{
  S.profile={...S.profile,weight:65,height:165,age:28,goal:'lean_gain',activity:'medium',manualCalories:'',manualProtein:''};
  S.weights=Array.from({length:6},(_,i)=>({id:'t'+i,ts:now-(25-i*5)*864e5,weight:65+i*.01}));
  const adaptive=nutritionTargets();
  S.readiness={sleep:5,energy:5,soreness:1,stress:1};
  const mk=(id,days)=>({id,ts:now-days*864e5,end:now-days*864e5,type:'upperA',location:'gym',exercises:[{exerciseId:'chest-press',name:'Chest Press',results:[{done:true,weight:30,reps:10,rir:2},{done:true,weight:30,reps:10,rir:2},{done:true,weight:30,reps:10,rir:2}]}]});
  S.logs=[mk('p1',1),mk('p2',4),mk('p3',7)];
  const plateau=progressionAdvice({exerciseId:'chest-press',name:'Chest Press',reps:'8–12'});
  const local={...defaults(),profile:{...defaults().profile,name:'LOCAL'},logs:[{id:'local-log',ts:2}],meals:[{id:'meal-local',ts:2}]};
  const cloud={...defaults(),profile:{...defaults().profile,name:'CLOUD'},logs:[{id:'cloud-log',ts:1}],meals:[{id:'meal-cloud',ts:1}]};
  const merged=dgMergeStates(local,cloud);
  return{adapt:adaptive.adapt,adaptReason:adaptive.adaptReason,plateau:plateau.title,mergedLogs:merged.logs.map(x=>x.id),mergedMeals:merged.meals.map(x=>x.id),mergedName:merged.profile.name};
 }finally{S=backup}
});
if(logic.adapt!==100)throw new Error('Adaptive calories did not increase on stalled lean gain: '+JSON.stringify(logic));
if(logic.plateau!=='Plateau detected')throw new Error('Plateau detector failed: '+JSON.stringify(logic));
if(!logic.mergedLogs.includes('local-log')||!logic.mergedLogs.includes('cloud-log'))throw new Error('Cloud workout merge failed: '+JSON.stringify(logic));
if(!logic.mergedMeals.includes('meal-local')||!logic.mergedMeals.includes('meal-cloud'))throw new Error('Cloud meal merge failed: '+JSON.stringify(logic));
if(logic.mergedName!=='LOCAL')throw new Error('Local profile precedence failed: '+JSON.stringify(logic));
if(errors.length)throw new Error('Runtime errors: '+errors.join(' | '));
console.log('Athlete OS final 7.6 E2E OK',{dock,logic});
await browser.close();
