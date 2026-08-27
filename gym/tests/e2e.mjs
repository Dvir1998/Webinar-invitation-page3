import { chromium } from 'playwright';
const annotationText=value=>String(value||'Unknown core E2E failure').replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
const reportFatal=error=>{console.error(`::error title=Core E2E failure::${annotationText(error?.stack||error)}`);process.exit(1)};
process.on('uncaughtException',reportFatal);
process.on('unhandledRejection',reportFatal);
const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
await context.addInitScript(()=>localStorage.setItem('dvirGymMultiWelcomeV8','1'));
const users={
 dvirqa:{id:'11111111-1111-4111-8111-111111111111',name:'Dvir QA',token:'qa-token-a',refresh:'qa-refresh-a'},
 edenqa:{id:'22222222-2222-4222-8222-222222222222',name:'Eden QA',token:'qa-token-b',refresh:'qa-refresh-b'}
};
const cloud=new Map();
const makeSession=(username)=>{const u=users[username];return{access_token:u.token,refresh_token:u.refresh,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:u.id,aud:'authenticated',role:'authenticated',user_metadata:{username,full_name:u.name}}}};
const authUserFromReq=req=>{const h=req.headers()['authorization']||'';const t=h.replace(/^Bearer\s+/i,'');return Object.entries(users).find(([,u])=>u.token===t)?.[0]||''};
await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',async route=>{
 const req=route.request(),u=req.url(),method=req.method();let body={ok:true},status=200;
 const post=()=>{try{return req.postDataJSON()||{}}catch{return{}}};
 if(u.includes('/functions/v1/account-auth')){
  if(method==='GET')body={ok:true,version:2,mode:'username-password',recovery:true,zeroCost:true,userIsolation:true};
  else{const p=post(),username=String(p.username||'').toLowerCase();if(p.action==='signup'||p.action==='login'){if(!users[username]){status=401;body={ok:false,error:'invalid_credentials'}}else body={ok:true,session:makeSession(username),username,displayName:users[username].name,...(p.action==='signup'?{recoveryKey:username==='dvirqa'?'RECOVERY_A_123456789012345678901234567890123456':'RECOVERY_B_123456789012345678901234567890123456'}:{})}}else if(p.action==='recover')body={ok:true,recovered:true};else{status=400;body={ok:false,error:'unknown_action'}}}
 }else if(u.includes('/auth/v1/logout')){status=204;return route.fulfill({status,body:''})}
 else if(u.includes('/auth/v1/token')){const p=post(),username=p.refresh_token==='qa-refresh-a'?'dvirqa':'edenqa';body=makeSession(username)}
 else if(u.includes('/functions/v1/user-memory')){const who=authUserFromReq(req);if(!who){status=401;body={ok:false,error:'auth'}}else{const p=post(),uid=users[who].id;if(p.action==='push'){const prev=cloud.get(uid),version=(prev?.version||0)+1;cloud.set(uid,{state:p.state,version,updatedAt:new Date().toISOString()});body={ok:true,version,updatedAt:cloud.get(uid).updatedAt,userId:uid,encrypted:true}}else if(p.action==='delete'){cloud.delete(uid);body={ok:true,deleted:true}}else{const x=cloud.get(uid);body={ok:true,state:x?.state||null,version:x?.version||0,updatedAt:x?.updatedAt||null,userId:uid}}}}
 else if(u.includes('/functions/v1/user-ai-key')){body={ok:true,configured:false,provider:'openrouter',freeOnly:true,userScoped:true}}
 else if(u.includes('/functions/v1/user-coach')){body={reply:'QA coach',freeOnly:true,userScoped:true,servedBy:'openrouter/free'}}
 else if(u.includes('/functions/v1/user-push')){const p=post();body=p.action==='status'?{ok:true,subscribed:false,devices:0,userScoped:true}:{ok:true,subscribed:true,userScoped:true}}
 else if(u.includes('/functions/v1/user-privacy')){body={ok:true,memory:false,pushDevices:0,quota:false,ai:false,userScoped:true}}
 else if(u.includes('/food-lookup'))body=method==='GET'?{ok:true,source:'Open Food Facts v3'}:{ok:true,code:'12345678',name:'Test Protein Yogurt',brands:'Test',quantity:'200 g',servingQuantity:200,per100:{calories:100,protein:10,carbs:5,fat:2},source:'Open Food Facts'};
 else if(u.includes('/cloud-memory'))body=method==='GET'?{ok:true,version:4,conflictDetection:true}:{ok:true,state:null,updatedAt:null};
 else if(u.includes('/ai-key-setup'))body=method==='GET'?{ok:true,mode:'free-only',oauth:'pkce',originLocked:true}:{ok:true,configured:false,provider:'openrouter',freeOnly:true};
 else if(u.includes('/coach'))body={ok:true,freeOnly:true,model:'openrouter/free',originLocked:true};
 else if(u.includes('/push-subscribe'))body={ok:true,subscribed:false,originLocked:true};
 else if(u.includes('/push-dispatch'))body={ok:true,subscriptions:0,sent:0};
 else if(u.includes('/privacy-control'))body=method==='GET'?{ok:true,version:1}:{ok:true,memory:false,push:false,quota:false,ai:false};
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const domClick=selector=>page.locator(selector).evaluate(el=>el.click());
const waitReady=async()=>{await page.waitForSelector('body.ready',{timeout:30000});await page.waitForSelector('#screen-home.active',{timeout:10000});if(await page.locator('#onboardDialog[open]').count())await page.locator('#obBack').click().catch(()=>{})};
await page.goto(base,{waitUntil:'domcontentloaded'});await waitReady();

await page.waitForFunction(()=>document.documentElement.dataset.athleteOs==='9.3.1',null,{timeout:3000});
const dock=await page.evaluate(()=>{const d=document.querySelector('.dock'),items=[...document.querySelectorAll('.dock-item')].map(x=>{const r=x.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,label:x.querySelector('b')?.textContent||''}}),r=d.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,count:items.length,items,viewport:innerWidth}});
if(dock.count!==5||dock.left<0||dock.right>dock.viewport||dock.items.some(x=>x.left<0||x.right>dock.viewport||x.width<45))throw new Error('Dock geometry failed: '+JSON.stringify(dock));
if(await page.evaluate(()=>dgIsAccount()))throw new Error('Fresh browser must start in Guest mode');
await page.evaluate(()=>{S.profile.name='Guest QA';S.meals=[{id:'guest-meal',ts:Date.now(),description:'Guest only'}];save()});

await page.evaluate(()=>dgOpenAccount('signup'));
await page.locator('#dgSignupName').fill('Dvir QA');await page.locator('#dgAuthUser').fill('dvirqa');await page.locator('#dgAuthPassword').fill('Password123!');await domClick('#dgAuthSubmit');
await page.waitForSelector('#dgRecoverySaved',{timeout:10000});await domClick('#dgRecoverySaved');await page.waitForSelector('#dgAccountLogout',{timeout:10000});
if(!(await page.evaluate(()=>dgIsAccount()&&dgCurrentUsername()==='dvirqa')))throw new Error('Account A signup/scope failed');
await page.evaluate(()=>{S.profile.name='Dvir QA';S.meals=[{id:'a-meal',ts:Date.now(),description:'A ONLY',protein:30}];save()});
await page.evaluate(()=>dgCloudPush());await page.waitForTimeout(300);
const aScope=await page.evaluate(()=>({scope:dgScope(),meals:S.meals.map(x=>x.id),key:localStorage.getItem('dvirAthleteOS_v8::user:'+dgCurrentUserId())}));
if(!aScope.scope.startsWith('user:')||!aScope.meals.includes('a-meal')||!aScope.key)throw new Error('Account A scoped state not persisted');
await page.locator('#dgAccountDialog').evaluate(d=>d.close());

await page.evaluate(()=>dgLogout());await page.waitForTimeout(850);await waitReady();
if(await page.evaluate(()=>dgIsAccount()))throw new Error('Logout A failed');
if(await page.evaluate(()=>S.meals.some(x=>x.id==='a-meal')))throw new Error('Account A leaked into Guest scope');

await page.evaluate(()=>dgOpenAccount('login'));await page.locator('#dgAuthUser').fill('edenqa');await page.locator('#dgAuthPassword').fill('Password123!');await domClick('#dgAuthSubmit');await page.waitForSelector('#dgAccountLogout',{timeout:10000});
if(!(await page.evaluate(()=>dgIsAccount()&&dgCurrentUsername()==='edenqa')))throw new Error('Account B login failed');
if(await page.evaluate(()=>S.meals.some(x=>x.id==='a-meal'||x.id==='guest-meal')))throw new Error('A/Guest data leaked into B');
await page.evaluate(()=>{S.profile.name='Eden QA';S.meals=[{id:'b-meal',ts:Date.now(),description:'B ONLY',protein:25}];save()});
await page.locator('#dgAccountDialog').evaluate(d=>d.close());
await page.evaluate(()=>dgLogout());await page.waitForTimeout(850);await waitReady();

await page.evaluate(()=>dgOpenAccount('login'));await page.locator('#dgAuthUser').fill('dvirqa');await page.locator('#dgAuthPassword').fill('Password123!');await domClick('#dgAuthSubmit');await page.waitForSelector('#dgAccountLogout',{timeout:10000});await page.locator('#dgAccountDialog').evaluate(d=>d.close());await page.waitForTimeout(300);
const isolation=await page.evaluate(()=>({username:dgCurrentUsername(),mealIds:S.meals.map(x=>x.id),scope:dgScope(),account:dgIsAccount()}));
if(isolation.username!=='dvirqa'||!isolation.mealIds.includes('a-meal')||isolation.mealIds.includes('b-meal'))throw new Error('Account isolation failed: '+JSON.stringify(isolation));

await domClick('[data-screen="fuel"]');await page.waitForSelector('#screen-fuel.active');await page.waitForSelector('#dgBarcodeFood');await domClick('#dgBarcodeFood');await page.waitForSelector('#mealDialog[open]');await page.locator('#dgBarcodeManual').fill('12345678');await domClick('#dgFoodLookupBtn');await page.waitForSelector('#dgFoodAmount',{timeout:10000});await page.locator('#dgFoodAmount').fill('150');await domClick('#dgAddScannedFood');await page.waitForFunction(()=>!document.querySelector('#mealDialog')?.open);const scanned=await page.evaluate(()=>S.meals.find(x=>x.barcode==='12345678'));if(!scanned||scanned.calories!==150||scanned.protein!==15)throw new Error('Barcode macro calculation failed');
await domClick('[data-screen="more"]');await page.waitForSelector('#screen-more.active');await page.waitForSelector('#dgAccountCard',{timeout:10000});await page.waitForSelector('#dgPrivacyV73',{timeout:10000});await page.waitForSelector('#dgLaunchChecklist',{timeout:10000});await page.waitForSelector('#dgThemeCard',{timeout:10000});
const accountCard=await page.locator('#dgAccountCard').innerText();if(!accountCard.includes('Dvir QA')||!accountCard.includes('@dvirqa'))throw new Error('Account card identity mismatch');
if(await page.evaluate(()=>document.documentElement.dataset.dgTheme)!=='bright')throw new Error('Bright theme should be default');await domClick('.dg-theme-option[data-theme="night"]');if(await page.evaluate(()=>document.documentElement.dataset.dgTheme)!=='night')throw new Error('Night theme failed');await domClick('.dg-theme-option[data-theme="bright"]');
await domClick('[data-screen="home"]');await page.waitForSelector('#screen-home.active');await domClick('#buildToday');await page.waitForSelector('#workoutDialog[open]',{timeout:15000});await page.waitForSelector('#dgSmartSetBrief',{timeout:5000});await page.waitForSelector('#dgTechniqueCheck',{timeout:5000});if(await page.locator('#swapExercise').count()){await domClick('#swapExercise');await page.waitForSelector('#machineDialog[open]');await page.waitForSelector('.dg-swap-option');await domClick('#dgSwapClose')}
const logic=await page.evaluate(()=>{const backup=JSON.parse(JSON.stringify(S)),now=Date.now();try{S.profile={...S.profile,weight:65,height:165,age:28,goal:'lean_gain',activity:'medium',manualCalories:'',manualProtein:''};S.weights=Array.from({length:6},(_,i)=>({id:'t'+i,ts:now-(25-i*5)*864e5,weight:65+i*.01}));const adaptive=nutritionTargets();S.readiness={sleep:5,energy:5,soreness:1,stress:1};const mk=(id,days)=>({id,ts:now-days*864e5,end:now-days*864e5,type:'upperA',location:'gym',exercises:[{exerciseId:'chest-press',name:'Chest Press',results:[{done:true,weight:30,reps:10,rir:2},{done:true,weight:30,reps:10,rir:2},{done:true,weight:30,reps:10,rir:2}]}]});S.logs=[mk('p1',1),mk('p2',4),mk('p3',7)];const plateau=progressionAdvice({exerciseId:'chest-press',name:'Chest Press',reps:'8–12'});return{adapt:adaptive.adapt,plateau:plateau.title}}finally{S=backup}});
if(logic.adapt!==100||logic.plateau!=='Plateau detected')throw new Error('Decision Engine regression: '+JSON.stringify(logic));
if(errors.length)throw new Error('Runtime errors: '+errors.join(' | '));
console.log('Athlete OS 8.0 transition-safe multi-user E2E OK',{dock,isolation,logic});await browser.close();
