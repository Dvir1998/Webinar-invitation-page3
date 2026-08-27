import { chromium } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
await context.addInitScript(()=>{
 const userId='44444444-4444-4444-8444-444444444444';
 const state={version:'9.3.1',appVersion:'9.3.1',profile:{name:'דביר',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[],ai:{providerPreference:'auto'}};
 const session={access_token:'ai-qa-token',refresh_token:'ai-qa-refresh',expires_at:Math.floor(Date.now()/1000)+3600,accountUsername:'dvirqa',displayName:'דביר',user:{id:userId,user_metadata:{username:'dvirqa',full_name:'דביר'}}};
 localStorage.setItem('dvirGymMultiWelcomeV8','1');
 localStorage.setItem('dvirGymAuthSessionV8',JSON.stringify(session));
 localStorage.setItem('dvirAthleteOS_v8::user:'+userId,JSON.stringify(state));
});

let geminiConfigured=false;
const vaultRequests=[];
const coachRequests=[];
await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',async route=>{
 const request=route.request(),url=request.url();let payload={};
 try{payload=request.postDataJSON()||{}}catch{}
 let body={ok:true};
 if(url.includes('/functions/v1/user-ai-key')){
  vaultRequests.push(payload);
  if(payload.action==='set'&&payload.provider==='gemini')geminiConfigured=true;
  body=payload.action==='set'?{ok:true,configured:true,provider:'gemini',testedModel:'gemini-2.5-flash',providers:{gemini:{configured:true},openrouter:{configured:false}}}:{ok:true,configured:geminiConfigured,providers:{gemini:{configured:geminiConfigured},openrouter:{configured:false}}};
 }else if(url.includes('/functions/v1/user-coach')){
  coachRequests.push(payload);
  body={ok:true,reply:'תשובת מאמן אישית ממנוע ג׳מיני',provider:'gemini',servedBy:'gemini-2.5-flash'};
 }else if(url.includes('/functions/v1/user-push'))body={ok:true,subscribed:false,devices:0};
 else if(url.includes('/functions/v1/user-privacy'))body={ok:true,memory:false,pushDevices:0,quota:false,ai:geminiConfigured};
 else if(url.includes('/functions/v1/user-memory'))body={ok:true,state:null,version:0};
 await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
});
await context.route('https://dvir-gym-athlete-ai-dvirs-projects-b157a454.vercel.app/**',route=>route.fulfill({status:410,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":false}'}));

const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.locator('body.ready').waitFor({timeout:30000});

await page.locator('[data-screen="coach"]').evaluate(button=>button.click());
await page.locator('#dgCoachSetupV931').waitFor();
if(!(await page.locator('#dgCoachSetupV931').innerText()).includes('מקומי ומוגבל'))throw new Error('Coach did not disclose local limited mode before provider setup');

await page.locator('[data-screen="more"]').evaluate(button=>button.click());
await page.locator('#dgAiStudioV93').waitFor({timeout:10000});
await page.locator('#dg-gemini-key-v93').fill('AIzaSyDUMMY_GEMINI_KEY_FOR_BROWSER_QA_123456');
await page.locator('[data-dg-save-provider="gemini"]').evaluate(button=>button.click());
await page.waitForFunction(()=>document.querySelector('#dgAiStudioV93')?.innerText.includes('CONNECTED'),null,{timeout:10000});

await page.locator('[data-screen="coach"]').evaluate(button=>button.click());
await page.locator('#coachInput').fill('בנה לי ארוחה אחרי אימון בוקר');
await page.locator('#coachSend').evaluate(button=>button.click());
await page.waitForFunction(()=>document.querySelector('#messages')?.innerText.includes('תשובת מאמן אישית ממנוע ג׳מיני'),null,{timeout:10000});

const result=await page.evaluate(()=>({provider:S.ai?.lastProvider,model:S.ai?.lastModel,offline:S.chat.at(-1)?.offline||false,setup:document.querySelector('#dgCoachSetupV931')?.innerText||''}));
if(!vaultRequests.some(request=>request.action==='set'&&request.provider==='gemini'&&String(request.apiKey).startsWith('AIza')))throw new Error('Gemini key was not sent to the user-scoped vault endpoint');
if(!coachRequests.some(request=>request.providerPreference==='auto'&&String(request.message).includes('ארוחה')))throw new Error('Coach request did not include provider preference and user message');
if(result.provider!=='gemini'||result.model!=='gemini-2.5-flash'||result.offline)throw new Error(`Cloud coach state mismatch ${JSON.stringify(result)}`);
if(errors.length)throw new Error(`Runtime errors: ${errors.join(' | ')}`);

console.log('Gemini provider vault and real coach path OK',{vaultRequests:vaultRequests.length,coachRequests:coachRequests.length,result});
await browser.close();
