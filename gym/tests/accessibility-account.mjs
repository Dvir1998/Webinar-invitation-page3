import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const parseRgb=value=>(String(value).match(/[\d.]+/g)||[]).slice(0,3).map(Number);
const luminance=color=>{
 const channels=color.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4});
 return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]
};
const contrast=(foreground,background)=>{const a=luminance(parseRgb(foreground)),b=luminance(parseRgb(background));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};

for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
 const context=await browser.newContext({viewport,locale:'he-IL',reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  const state={version:'9.1.1',profile:{name:'',complete:false,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[]};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body.ready',{timeout:30000});
 await page.waitForSelector('#dgAccountEntryV911');
 await page.waitForSelector('#onboardDialog[open]',{timeout:2000}).catch(()=>{});
 if(await page.locator('#onboardDialog[open]').count())await page.locator('#obBack').click();

 const entry=page.getByRole('button',{name:'כניסה או הרשמה לחשבון'});
 if(!await entry.isVisible())throw new Error(`${viewport.name}: visible account entry missing`);
 const entryBox=await entry.boundingBox();
 if(!entryBox||entryBox.height<44||entryBox.x<0||entryBox.x+entryBox.width>viewport.width)throw new Error(`${viewport.name}: account entry geometry failed ${JSON.stringify(entryBox)}`);
 await entry.click();
 await page.waitForSelector('#dgAccountDialog[open]');
 const accountText=await page.locator('#dgAccountDialog').innerText();
 if(!accountText.includes('צור חשבון אישי')||!accountText.includes('יש לי כבר חשבון'))throw new Error(`${viewport.name}: account choices missing`);
 await page.locator('#dgAuthClose').click();

 const avatar=page.getByRole('button',{name:'כניסה או הרשמה',exact:true});
 await avatar.click();
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

await browser.close();
