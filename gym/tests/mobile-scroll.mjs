import { chromium,webkit } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const engine=process.env.DG_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const context=await browser.newContext({
 viewport:{width:390,height:844},
 locale:'he-IL',
 serviceWorkers:'block',
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

const fulfillOffline=route=>{
 const requestHeaders=route.request().headers();
 const origin=requestHeaders.origin||new URL(base).origin;
 const headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-methods':requestHeaders['access-control-request-method']||'GET, POST, OPTIONS','access-control-allow-headers':requestHeaders['access-control-request-headers']||'authorization, apikey, content-type, x-client-info'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
 return route.fulfill({status:503,contentType:'application/json',headers,body:'{"ok":false}'});
};
await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',fulfillOffline);
await context.route('https://dvir-gym-athlete-ai-dvirs-projects-b157a454.vercel.app/**',fulfillOffline);
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
	}else await page.evaluate(({target,before})=>{
	 if(target==='window'){
	  const root=document.scrollingElement||document.documentElement;
	  root.scrollTop=before+620;
	  window.scrollTo(0,before+620);
	  return;
	 }
	 const node=document.querySelector(target);
	 if(node)node.scrollTop=before+620;
	},{target,before});
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

const tabs=engine==='webkit'?[{screen:'more',label:'עוד'}]:[{screen:'fuel',label:'תזונה'},{screen:'progress',label:'התקדמות'},{screen:'more',label:'עוד'}];
for(const tab of tabs){
	await page.locator(`.dock-item[data-screen="${tab.screen}"]`).click();
 await page.locator('.screen.active').waitFor();
	await page.waitForTimeout(engine==='webkit'&&tab.screen==='more'?50:300);
	await assertDocumentScroll(tab.label);
}

await page.locator('.dg-machine-card-v91').first().waitFor({timeout:10000});
for(let attempt=0;attempt<5;attempt++){
 const before=await page.evaluate(()=>{const button=document.querySelector('#dgMachineLoadMoreV931');if(!button)return null;const count=document.querySelectorAll('.dg-machine-card-v91').length;button.click();return count});
 if(before===null)break;
 await page.waitForFunction(before=>document.querySelectorAll('.dg-machine-card-v91').length>before||!document.querySelector('#dgMachineLoadMoreV931'),before,{timeout:3000});
}
if(await page.evaluate(()=>!!document.querySelector('#dgMachineLoadMoreV931')))throw new Error('Machine library load-more control did not finish after five attempts');
await page.evaluate(()=>openMachine('chest-press'));
await page.locator('#machineDialog[open]').waitFor({state:'attached'});
const dialogMetrics=await page.evaluate(()=>{const dialog=document.querySelector('#machineDialog[open]');return dialog?{clientHeight:dialog.clientHeight,scrollHeight:dialog.scrollHeight,overflow:getComputedStyle(dialog).overflowY}:null});
if(!dialogMetrics)throw new Error('Machine dialog disappeared before its scroll metrics could be measured');
if(dialogMetrics.scrollHeight<=dialogMetrics.clientHeight+20)throw new Error(`Machine dialog has no scrollable content ${JSON.stringify(dialogMetrics)}`);
const dialogAfter=await swipeUp('#machineDialog');
console.log('Machine dialog mobile touch scroll OK',{dialogAfter,...dialogMetrics});

if(errors.length)throw new Error(`Runtime errors: ${errors.join(' | ')}`);
await browser.close();
