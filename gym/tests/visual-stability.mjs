import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});

for(const viewport of [
 {name:'mobile',width:390,height:844},
 {name:'desktop',width:1440,height:1000}
]){
 const context=await browser.newContext({viewport,locale:'he-IL'});
 await context.addInitScript(()=>{
  const state={version:'9.2.1',appVersion:'9.2.1',profile:{name:'דביר',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[]};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
  window.__dgVisualStability={readyAt:0,lastMutation:0,shifts:[],errors:[]};
  new PerformanceObserver(list=>{
   for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__dgVisualStability.shifts.push({value:entry.value,startTime:entry.startTime});
  }).observe({type:'layout-shift',buffered:true});
  addEventListener('DOMContentLoaded',()=>{
   const mark=()=>{window.__dgVisualStability.lastMutation=performance.now();if(document.body?.classList.contains('ready')&&!window.__dgVisualStability.readyAt)window.__dgVisualStability.readyAt=performance.now()};
   new MutationObserver(mark).observe(document.body,{subtree:true,childList:true,attributes:true});
   mark();
  });
  addEventListener('error',event=>window.__dgVisualStability.errors.push(String(event.message||event.error||'runtime error')));
 });
 await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
 const page=await context.newPage();
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body.ready',{timeout:10000});
 await page.waitForSelector('#dgAccountEntryV912');
 await page.waitForSelector('#dgDailyTrackerV92');
 await page.waitForFunction(()=>performance.now()-window.__dgVisualStability.lastMutation>700,{timeout:6000});

 const result=await page.evaluate(()=>{
  const stability=window.__dgVisualStability,afterReady=stability.shifts.filter(entry=>entry.startTime>=stability.readyAt),home=document.querySelector('#screen-home');
  return{
   readyAt:stability.readyAt,
   settledAt:stability.lastMutation,
   clsAfterReady:afterReady.reduce((total,entry)=>total+entry.value,0),
   shiftCountAfterReady:afterReady.length,
   hasAccountEntry:!!document.querySelector('#dgAccountEntryV912'),
   hasDailyTracker:!!document.querySelector('#dgDailyTrackerV92'),
   homeHeight:home?.getBoundingClientRect().height||0,
   overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   errors:stability.errors
  };
 });
 if(!result.readyAt||!result.hasAccountEntry||!result.hasDailyTracker||result.homeHeight<500)throw new Error(`${viewport.name}: first frame was incomplete ${JSON.stringify(result)}`);
 if(result.clsAfterReady>.02)throw new Error(`${viewport.name}: visible layout shift is too high ${JSON.stringify(result)}`);
 if(result.overflow>1)throw new Error(`${viewport.name}: horizontal overflow ${result.overflow}`);
 if(result.errors.length)throw new Error(`${viewport.name}: runtime errors ${result.errors.join(' | ')}`);
 console.log(`Visual stability ${viewport.name} OK`,result);
 await context.close();
}

const edenContext=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
await edenContext.addInitScript(()=>{
 const userId='33333333-3333-4333-8333-333333333333',state={version:'9.2.1',appVersion:'9.2.1',profile:{name:'עדן',complete:true,days:4,goal:'lean_gain',weight:60,height:165,age:28},location:'gym',prefs:{theme:'pearl'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[]};
 const session={access_token:'eden-local-test',refresh_token:'eden-local-refresh',expires_at:Math.floor(Date.now()/1000)+3600,accountUsername:'edenchoen',displayName:'עדן כהן',user:{id:userId,user_metadata:{username:'edenchoen',full_name:'עדן כהן'}}};
 localStorage.setItem('dvirGymMultiWelcomeV8','1');
 localStorage.setItem('dvirGymAuthSessionV8',JSON.stringify(session));
 localStorage.setItem('dvirAthleteOS_v8::user:'+userId,JSON.stringify(state));
});
await edenContext.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
const edenPage=await edenContext.newPage();
await edenPage.goto(base,{waitUntil:'domcontentloaded'});
await edenPage.waitForSelector('body.ready',{timeout:10000});
await edenPage.waitForSelector('.dg-personal-motivation');
const eden=await edenPage.evaluate(()=>({
 username:dgCurrentUsername(),
 generated:dgUsernameFromName('עדן כהן'),
 banner:document.querySelector('.dg-global-banner')?.textContent||'',
 motivation:document.querySelector('.dg-personal-motivation')?.textContent||'',
 reminder:!!document.querySelector('#dgMotivationReminderToggle'),
 theme:document.documentElement.dataset.dgTheme
}));
if(eden.username!=='edenchoen'||eden.generated!=='edenchoen'||!eden.banner.includes('המרחב האישי של עדן')||!eden.motivation.includes('דוני')||!eden.reminder||eden.theme!=='pearl')throw new Error('Eden dedicated experience failed: '+JSON.stringify(eden));
console.log('Eden dedicated experience OK',eden);
await edenContext.close();

await browser.close();
