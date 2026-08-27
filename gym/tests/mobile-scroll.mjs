import { chromium,webkit } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const engine=process.env.DG_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const context=await browser.newContext({
 viewport:{width:390,height:844},
 locale:'he-IL',
 isMobile:engine!=='webkit',
 hasTouch:engine!=='webkit',
 deviceScaleFactor:3,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
});

await context.addInitScript(()=>{
 const state={version:'9.3.1',appVersion:'9.3.1',profile:{name:'דביר',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[]};
 localStorage.setItem('dvirGymMultiWelcomeV8','1');
 localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
 localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
});

await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":false}'}));
await context.route('https://dvir-gym-athlete-ai-dvirs-projects-b157a454.vercel.app/**',route=>route.fulfill({status:410,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":false}'}));
const page=await context.newPage();
const cdp=engine==='chromium'?await context.newCDPSession(page):null;
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));

async function swipeUp(target='window'){
 const before=await page.evaluate(target=>target==='window'?scrollY:document.querySelector(target)?.scrollTop||0,target);
 if(cdp){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:710,radiusX:6,radiusY:6,force:1}]});
  for(const y of [640,570,500,430,360,290,220])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y,radiusX:6,radiusY:6,force:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else await page.evaluate(target=>{
  const node=target==='window'?window:document.querySelector(target);
  node?.scrollBy?.({top:620,left:0,behavior:'instant'});
 },target);
 await page.waitForFunction(({target,before})=>{
  const now=target==='window'?scrollY:document.querySelector(target)?.scrollTop||0;
  return now>before+24;
 },{target,before},{timeout:2500});
 return page.evaluate(target=>target==='window'?scrollY:document.querySelector(target)?.scrollTop||0,target);
}

async function assertDocumentScroll(label){
 await page.evaluate(()=>scrollTo(0,0));
 const metrics=await page.evaluate(()=>({
  viewport:innerHeight,
  scrollHeight:document.documentElement.scrollHeight,
  bodyHeight:document.body.getBoundingClientRect().height,
  htmlOverflow:getComputedStyle(document.documentElement).overflowY,
  bodyOverflow:getComputedStyle(document.body).overflowY,
  bodyPosition:getComputedStyle(document.body).position,
  touchAction:getComputedStyle(document.body).touchAction
 }));
 if(metrics.scrollHeight<=metrics.viewport+80)throw new Error(`${label}: page has no scrollable content ${JSON.stringify(metrics)}`);
 const after=await swipeUp();
 if(after<25)throw new Error(`${label}: touch swipe did not scroll ${JSON.stringify({...metrics,after})}`);
 console.log(`${label} ${engine} mobile scroll OK`,{after,...metrics});
}

await page.goto(base,{waitUntil:'domcontentloaded'});
await page.locator('body.ready').waitFor({timeout:30000});
await page.getByRole('button',{name:/כניסה או הרשמה|פתיחת החשבון שלי/}).waitFor();
await assertDocumentScroll('Home');

const tabs=engine==='webkit'?['עוד']:['תזונה','התקדמות','עוד'];
for(const tab of tabs){
	await page.getByRole('button',{name:tab,exact:true}).click();
 await page.locator('.screen.active').waitFor();
 await page.waitForTimeout(engine==='webkit'&&tab==='עוד'?50:300);
 await assertDocumentScroll(tab);
}

while(await page.locator('#dgMachineLoadMoreV931').count())await page.locator('#dgMachineLoadMoreV931').evaluate(button=>button.click());
await page.getByRole('button',{name:/המכשיר שדוחפים קדימה/}).evaluate(button=>button.click());
await page.locator('#machineDialog[open]').waitFor();
const dialogMetrics=await page.locator('#machineDialog').evaluate(dialog=>({clientHeight:dialog.clientHeight,scrollHeight:dialog.scrollHeight,overflow:getComputedStyle(dialog).overflowY}));
if(dialogMetrics.scrollHeight<=dialogMetrics.clientHeight+20)throw new Error(`Machine dialog has no scrollable content ${JSON.stringify(dialogMetrics)}`);
const dialogAfter=await swipeUp('#machineDialog');
console.log('Machine dialog mobile touch scroll OK',{dialogAfter,...dialogMetrics});

if(errors.length)throw new Error(`Runtime errors: ${errors.join(' | ')}`);
await browser.close();
