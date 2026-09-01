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
 const request=route.request(),url=request.url();let payload={},status=200;
 try{payload=request.postDataJSON()||{}}catch{}
 let body={ok:true};
 if(url.includes('/functions/v1/user-ai-key')){
  vaultRequests.push(payload);
  if(payload.action==='set'&&payload.provider==='gemini'&&String(payload.apiKey).includes('REJECTED')){status=400;body={ok:false,error:'gemini_key_rejected',status:'API_KEY_INVALID'}}
  else{if(payload.action==='set'&&payload.provider==='gemini')geminiConfigured=true;body=payload.action==='set'?{ok:true,configured:true,provider:'gemini',testedModel:'gemini-2.5-flash',providers:{gemini:{configured:true},openrouter:{configured:false}}}:{ok:true,configured:geminiConfigured,providers:{gemini:{configured:geminiConfigured},openrouter:{configured:false}}}}
 }else if(url.includes('/functions/v1/user-coach')){
  coachRequests.push(payload);
  body={ok:true,reply:'תשובת מאמן אישית ממנוע ג׳מיני',provider:'gemini',servedBy:'gemini-2.5-flash'};
 }else if(url.includes('/functions/v1/user-push'))body={ok:true,subscribed:false,devices:0};
 else if(url.includes('/functions/v1/user-privacy'))body={ok:true,memory:false,pushDevices:0,quota:false,ai:geminiConfigured};
 else if(url.includes('/functions/v1/user-memory'))body={ok:true,state:null,version:0};
 await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
});
await context.route('https://dvir-gym-athlete-ai-dvirs-projects-b157a454.vercel.app/**',route=>route.fulfill({status:410,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":false}'}));

const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.locator('body.ready').waitFor({timeout:30000});

await page.locator('[data-screen="coach"]').evaluate(button=>button.click());
await page.locator('#dgCoachSetupV931').waitFor();
if(!(await page.locator('#dgCoachSetupV931').innerText()).includes('מקומי ומוגבל'))throw new Error('Coach did not disclose local limited mode before provider setup');
await page.locator('#dgCoachGeminiSetupV941').waitFor();
await page.waitForTimeout(400);
const contrast=await page.evaluate(()=>{
 const luminance=color=>{const rgb=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(value=>{const c=value/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};
 const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 return['.coach-hero h1','.coach-hero p','#dgCoachSetupV931 b','#dgCoachSetupV931 small','#dgCoachGeminiSetupV941 b','#dgCoachGeminiSetupV941 p'].map(selector=>{const node=document.querySelector(selector),color=getComputedStyle(node).color;return{selector,color,ratio:ratio(color,'rgb(255,255,255)')}});
});
if(contrast.some(item=>item.ratio<4.5))throw new Error(`Light coach contrast failed ${JSON.stringify(contrast)}`);
if(process.env.DG_SCREENSHOT)await page.screenshot({path:process.env.DG_SCREENSHOT,fullPage:true});
await page.locator('#dgCoachGeminiKeyV941').fill('GEMINI_API_KEY="AIzaSyREJECTED_GEMINI_KEY_FOR_BROWSER_QA_123"');
const filledInput=await page.locator('#dgCoachGeminiKeyV941').elementHandle();
await page.waitForTimeout(2300);
const delayedDraft=await page.evaluate(input=>({connected:input?.isConnected,value:document.querySelector('#dgCoachGeminiKeyV941')?.value}),filledInput);
if(!delayedDraft.connected||!delayedDraft.value.includes('REJECTED'))throw new Error(`Gemini draft did not survive delayed coach refresh ${JSON.stringify(delayedDraft)}`);
await page.locator('#dgCoachGeminiSaveV941').evaluate(button=>button.click());
await page.waitForFunction(()=>document.querySelector('#dgCoachGeminiSetupV941 [data-dg-provider-feedback]')?.dataset.state==='error',null,{timeout:10000});
const rejected=await page.evaluate(()=>({value:document.querySelector('#dgCoachGeminiKeyV941')?.value,type:document.querySelector('#dgCoachGeminiKeyV941')?.type,disabled:document.querySelector('#dgCoachGeminiSaveV941')?.disabled,feedback:document.querySelector('#dgCoachGeminiSetupV941 [data-dg-provider-feedback]')?.innerText}));
if(!rejected.value.startsWith('AIzaSyREJECTED')||rejected.type!=='password'||rejected.disabled||!rejected.feedback.includes('דחה')||!rejected.feedback.includes('API_KEY_INVALID'))throw new Error(`Persistent Gemini rejection UX failed ${JSON.stringify(rejected)}`);
await page.locator('#dgCoachGeminiSetupV941 [data-dg-toggle-key]').evaluate(button=>button.click());
if(await page.locator('#dgCoachGeminiKeyV941').getAttribute('type')!=='text')throw new Error('Gemini reveal control failed');
await page.locator('#dgCoachGeminiSetupV941 [data-dg-toggle-key]').evaluate(button=>button.click());
await page.locator('#dgCoachGeminiKeyV941').fill('AIzaSyDUMMY_GEMINI_KEY_FOR_BROWSER_QA_123456');
await page.locator('#dgCoachGeminiSaveV941').evaluate(button=>button.click());
await page.waitForFunction(()=>typeof dgAiConfigured!=='undefined'&&dgAiConfigured===true&&document.querySelector('#dgCoachSetupV931')?.innerText.includes('AI אמיתי מחובר'),null,{timeout:10000});

await page.locator('[data-screen="more"]').evaluate(button=>button.click());
await page.locator('#dgAiStudioV93').waitFor({timeout:10000});
await page.waitForFunction(()=>document.querySelector('#dgAiStudioV93')?.innerText.includes('מחובר ומאומת'),null,{timeout:10000});

await page.locator('[data-screen="coach"]').evaluate(button=>button.click());
await page.locator('#coachInput').fill('בנה לי ארוחה אחרי אימון בוקר');
await page.locator('#coachSend').evaluate(button=>button.click());
await page.waitForFunction(()=>document.querySelector('#messages')?.innerText.includes('תשובת מאמן אישית ממנוע ג׳מיני'),null,{timeout:10000});

const clearButton=page.getByRole('button',{name:'נקה את כל השיחה עם המאמן'});
await clearButton.waitFor({state:'visible'});
const clearBox=await clearButton.boundingBox();
if(!clearBox||clearBox.height<44||clearBox.width<44)throw new Error(`Clear chat touch target failed ${JSON.stringify(clearBox)}`);
page.once('dialog',dialog=>dialog.accept());
await clearButton.click();
await page.waitForFunction(()=>Array.isArray(S.chat)&&S.chat.length===0&&document.querySelector('#dgCoachToolsV95 span')?.innerText.includes('אין הודעות'));
if(!await clearButton.isDisabled())throw new Error('Clear chat button did not disable after deletion');

const result=await page.evaluate(()=>({provider:S.ai?.lastProvider,model:S.ai?.lastModel,chatCount:S.chat.length,setup:document.querySelector('#dgCoachSetupV931')?.innerText||''}));
if(!vaultRequests.some(request=>request.action==='set'&&request.provider==='gemini'&&String(request.apiKey).includes('REJECTED')))throw new Error('Rejected Gemini path was not tested');
if(!vaultRequests.some(request=>request.action==='set'&&request.provider==='gemini'&&String(request.apiKey).startsWith('AIzaSyDUMMY')))throw new Error('Gemini key was not sent to the user-scoped vault endpoint');
if(!coachRequests.some(request=>request.providerPreference==='gemini'&&String(request.message).includes('ארוחה')))throw new Error('Coach request did not prefer Gemini and include the user message');
if(result.provider!=='gemini'||result.model!=='gemini-2.5-flash'||result.chatCount!==0)throw new Error(`Cloud coach state mismatch ${JSON.stringify(result)}`);
if(errors.length)throw new Error(`Runtime errors: ${errors.join(' | ')}`);

console.log('Direct Gemini setup, persistent diagnostics and real coach path OK',{vaultRequests:vaultRequests.length,coachRequests:coachRequests.length,rejected,result});
await browser.close();
