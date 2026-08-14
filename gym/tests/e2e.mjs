import { chromium } from 'playwright';
const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',async route=>{
 const u=route.request().url(),method=route.request().method();let body={ok:true};
 if(u.includes('/cloud-memory'))body=method==='GET'?{ok:true,version:4,conflictDetection:true}:{ok:true,state:null,updatedAt:null};
 if(u.includes('/ai-key-setup'))body=method==='GET'?{ok:true,mode:'free-only',oauth:'pkce'}:{ok:true,configured:false,provider:'openrouter',freeOnly:true};
 if(u.includes('/coach'))body={ok:true,freeOnly:true,model:'openrouter/free'};
 if(u.includes('/push-subscribe'))body={ok:true,subscribed:false};
 if(u.includes('/push-dispatch'))body={ok:true,subscriptions:0,sent:0};
 if(u.includes('/privacy-control'))body=method==='GET'?{ok:true,version:1}:{ok:true,memory:false,push:false,quota:false,ai:false};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.waitForSelector('body.ready',{timeout:30000});
await page.waitForSelector('#screen-home.active',{timeout:10000});
// Dismiss first-run onboarding without mutating user data.
if(await page.locator('#onboardDialog[open]').count()){await page.locator('#obBack').click();}
await page.locator('[data-screen="fuel"]').click();
await page.waitForSelector('#screen-fuel.active');
await page.locator('[data-screen="more"]').click();
await page.waitForSelector('#screen-more.active');
await page.waitForSelector('#dgPrivacyV73',{timeout:10000});
await page.locator('#profileBtn').click();
await page.waitForSelector('#profileDialog[open]');
await page.locator('#profileDialog .close').click();
await page.locator('[data-screen="home"]').click();
await page.locator('#buildToday').click();
await page.waitForSelector('#workoutDialog[open]',{timeout:15000});
await page.waitForSelector('#dgSmartSetBrief',{timeout:5000});
if(await page.locator('#swapExercise').count()){await page.locator('#swapExercise').click();await page.waitForSelector('#machineDialog[open]');await page.waitForSelector('.dg-swap-option');await page.locator('#dgSwapClose').click();}
if(errors.length)throw new Error('Runtime errors: '+errors.join(' | '));
console.log('Athlete OS E2E OK');
await browser.close();
