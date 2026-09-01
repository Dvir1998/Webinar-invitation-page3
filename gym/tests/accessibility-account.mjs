import { chromium } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const parseRgb=value=>(String(value).match(/[\d.]+/g)||[]).slice(0,3).map(Number);
const luminance=color=>{
 const channels=color.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4});
 return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]
};
const contrast=(foreground,background)=>{const a=luminance(parseRgb(foreground)),b=luminance(parseRgb(background));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
const stableBox=async(page,selector,viewportWidth)=>{
 const handle=await page.waitForFunction(({selector,viewportWidth})=>{
  const element=document.querySelector(selector),now=performance.now();
  if(!element||!element.isConnected||!element.getClientRects().length)return null;
  if(window.__dgStableAccountNode!==element){window.__dgStableAccountNode=element;window.__dgStableAccountSince=now;return null}
  if(now-(window.__dgStableAccountSince||0)<300)return null;
  const rect=element.getBoundingClientRect();
  if(rect.height<44||rect.x<0||rect.right>viewportWidth)return null;
  return{x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right};
 },{selector,viewportWidth},{timeout:10000,polling:50});
 return handle.jsonValue();
};

for(const viewport of [{name:'compact',width:320,height:700},{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
 const context=await browser.newContext({viewport,locale:'he-IL',reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  const state={version:'9.2.1',profile:{name:'',complete:false,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[]};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body.ready',{timeout:30000});
 await page.waitForSelector('#dgAccountEntryV912');
 await page.waitForSelector('#onboardDialog[open]',{timeout:2000}).catch(()=>{});
 if(await page.locator('#onboardDialog[open]').count())await page.locator('#obBack').click();

 const entry=page.getByRole('button',{name:'כניסה או הרשמה לחשבון'});
 await entry.waitFor({state:'visible',timeout:5000});
 if(!await entry.isVisible())throw new Error(`${viewport.name}: visible account entry missing`);
 const entryBox=await stableBox(page,'#dgAccountEntryV912',viewport.width);
 if(!entryBox||entryBox.height<44||entryBox.x<0||entryBox.x+entryBox.width>viewport.width)throw new Error(`${viewport.name}: account entry geometry failed ${JSON.stringify(entryBox)}`);
 await entry.click();
 await page.waitForSelector('#dgAccountDialog[open]');
 const accountText=await page.locator('#dgAccountDialog').innerText();
 if(!accountText.includes('צור חשבון אישי')||!accountText.includes('יש לי כבר חשבון'))throw new Error(`${viewport.name}: account choices missing`);
 await page.locator('#dgAuthClose').click();

 const headerAccount=page.getByRole('button',{name:'חשבון וכניסה',exact:true});
 if(!await headerAccount.isVisible())throw new Error(`${viewport.name}: persistent header account button missing`);
 const headerBox=await headerAccount.boundingBox();
 const headerLabel=await headerAccount.evaluate(element=>getComputedStyle(element,'::after').content);
 if(!headerBox||headerBox.width<82||headerBox.height<44||!headerLabel.includes('חשבון'))throw new Error(`${viewport.name}: header account control failed ${JSON.stringify({headerBox,headerLabel})}`);
 await headerAccount.click();
 await page.waitForSelector('#dgAccountDialog[open]');
 await page.locator('#dgAuthClose').click();

 const colors=await page.evaluate(()=>({
  paragraph:getComputedStyle(document.querySelector('.nudge p')).color,
  button:getComputedStyle(document.querySelector('.nudge button')).color,
  small:getComputedStyle(document.querySelector('.nudge small')).color
 }));
 for(const [name,color] of Object.entries(colors))if(contrast(color,'rgb(255, 255, 255)')<4.5)throw new Error(`${viewport.name}: ${name} contrast too low ${color}`);

 await page.getByRole('button',{name:/עוד/}).last().click();
 await page.waitForSelector('.dg-machine-card-v91');
 while(await page.locator('#dgMachineLoadMoreV931').count())await page.locator('#dgMachineLoadMoreV931').evaluate(button=>button.click());
 await page.getByRole('button',{name:/פתח מדריך המכשיר שדוחפים קדימה/}).click();
 await page.waitForSelector('#machineDialog[open]');
 const guide=await page.locator('#machineDialog .dg-guide-grid p').first().evaluate(element=>getComputedStyle(element).color);
 if(contrast(guide,'rgb(18, 24, 33)')<4.5)throw new Error(`${viewport.name}: machine guide contrast too low ${guide}`);
 const closeBox=await page.getByRole('button',{name:'סגור מדריך'}).boundingBox();
 if(!closeBox||closeBox.width<44||closeBox.height<44)throw new Error(`${viewport.name}: guide close target too small ${JSON.stringify(closeBox)}`);
 await page.getByRole('button',{name:'סגור מדריך'}).click();

 await page.evaluate(()=>{S.activeWorkout={id:'contrast-workout',title:'Upper A',type:'upperA',location:'gym',currentIndex:0,exercises:[{exerciseId:'chest-press',name:'Chest Press',sets:3,reps:'6–10',restSec:120,targetRIR:2,results:[]}]};save();openWorkout()});
 await page.waitForSelector('#dgConditioningProtocol');
 const warmup=await page.locator('#dgConditioningProtocol p').evaluate(element=>getComputedStyle(element).color);
 if(contrast(warmup,'rgb(18, 24, 33)')<4.5)throw new Error(`${viewport.name}: warm-up contrast too low ${warmup}`);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 if(overflow>1)throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
 if(errors.length)throw new Error(`${viewport.name}: runtime errors ${errors.join(' | ')}`);
 await context.close();
 console.log(`Accessibility and account entry ${viewport.name} OK`,{colors,guide,warmup});
}

const accountContext=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL',reducedMotion:'reduce'});
await accountContext.addInitScript(()=>{
 const userId='22222222-2222-4222-8222-222222222222';
 const state={version:'9.2.1',profile:{name:'דביר',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[]};
 const session={access_token:'local-test-token',refresh_token:'local-test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,accountUsername:'dvirqa',displayName:'דביר',user:{id:userId,user_metadata:{username:'dvirqa',full_name:'דביר'}}};
 localStorage.setItem('dvirGymMultiWelcomeV8','1');
 localStorage.setItem('dvirGymAuthSessionV8',JSON.stringify(session));
 localStorage.setItem('dvirAthleteOS_v8::user:'+userId,JSON.stringify(state));
});
const accountPage=await accountContext.newPage();
await accountPage.goto(base,{waitUntil:'domcontentloaded'});
await accountPage.waitForSelector('body.ready',{timeout:30000});
const accountEntry=accountPage.getByRole('button',{name:'פתיחת החשבון שלי'});
await accountEntry.waitFor({state:'visible',timeout:5000});
if(!await accountEntry.isVisible()||!(await accountEntry.innerText()).includes('החשבון שלי'))throw new Error('signed-in: persistent account entry missing');
await accountEntry.click();
await accountPage.waitForSelector('#dgAccountDialog[open]');
if(!(await accountPage.locator('#dgAccountDialog').innerText()).includes('dvirqa'))throw new Error('signed-in: account home did not open');
await accountContext.close();
console.log('Accessibility signed-in account entry OK');

await browser.close();
