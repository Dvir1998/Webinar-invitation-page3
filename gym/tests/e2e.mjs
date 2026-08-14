import { chromium } from 'playwright';
const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',async route=>{
 const u=route.request().url(),method=route.request().method();let body={ok:true};
 if(u.includes('/cloud-memory'))body=method==='GET'?{ok:true,version:4,conflictDetection:true}:{ok:true,state:null,updatedAt:null};
 if(u.includes('/ai-key-setup'))body=method==='GET'?{ok:true,mode:'free-only',oauth:'pkce',originLocked:true}:{ok:true,configured:false,provider:'openrouter',freeOnly:true};
 if(u.includes('/coach'))body={ok:true,freeOnly:true,model:'openrouter/free',originLocked:true};
 if(u.includes('/push-subscribe'))body={ok:true,subscribed:false,originLocked:true};
 if(u.includes('/push-dispatch'))body={ok:true,subscriptions:0,sent:0};
 if(u.includes('/privacy-control'))body=method==='GET'?{ok:true,version:1}:{ok:true,memory:false,push:false,quota:false,ai:false};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const domClick=selector=>page.locator(selector).evaluate(el=>el.click());
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.waitForSelector('body.ready',{timeout:30000});
await page.waitForSelector('#screen-home.active',{timeout:10000});
if(await page.locator('#onboardDialog[open]').count())await page.locator('#obBack').click();
await domClick('[data-screen="fuel"]');
await page.waitForSelector('#screen-fuel.active');
await domClick('[data-screen="more"]');
await page.waitForSelector('#screen-more.active');
await page.waitForSelector('#dgPrivacyV73',{timeout:10000});
await domClick('#profileBtn');
await page.waitForSelector('#profileDialog[open]');
await domClick('#profileDialog .close');
await domClick('[data-screen="home"]');
await page.waitForSelector('#screen-home.active');
await domClick('#buildToday');
await page.waitForSelector('#workoutDialog[open]',{timeout:15000});
await page.waitForSelector('#dgSmartSetBrief',{timeout:5000});
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
console.log('Athlete OS E2E + decision logic OK',logic);
await browser.close();
