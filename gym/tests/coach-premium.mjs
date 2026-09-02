import { chromium } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const themes=['bright','cream','pearl','aurora','night'];

for(const theme of themes){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'he-IL'});
 await context.addInitScript(savedTheme=>{
  const state={version:'9.3.1',appVersion:'9.3.1',profile:{name:'דביר',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},location:'gym',prefs:{theme:savedTheme},logs:[],meals:[],weights:[],measures:[],chat:[{role:'user',text:'מה כדאי לעשות היום?',ts:Date.now()-1000},{role:'assistant',text:'היום נבנה אימון מדויק לפי ההתאוששות וההתקדמות שלך.',ts:Date.now()}],photos:[],reminders:[],ai:{providerPreference:'auto'}};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirGymThemeV8::guest',savedTheme);
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
 },theme);
 await context.route('https://rufnflwelexnpgzpzzfq.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('body.ready').waitFor({timeout:30000});
 await page.locator('[data-screen="coach"]').click();await page.locator('.dg-coach-eyebrow-v96').waitFor();
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 const result=await page.evaluate(()=>{
  const box=selector=>{const rect=document.querySelector(selector)?.getBoundingClientRect();return rect?{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,width:rect.width,height:rect.height}:null};
  const style=selector=>{const node=document.querySelector(selector),css=node&&getComputedStyle(node);return css?{color:css.color,backgroundImage:css.backgroundImage}:null};
  return{
   title:document.querySelector('.coach-hero h1')?.textContent,
   labels:[...document.querySelectorAll('.dg-bubble-label-v96')].map(node=>node.textContent),
   composer:box('.composer'),dock:box('.dock'),send:box('#coachSend'),voice:box('#voiceBtn'),photo:box('#coachPhotoBtn'),
   ai:style('.bubble.ai'),user:style('.bubble.user'),
   inputLabel:document.querySelector('#coachInput')?.getAttribute('aria-label'),sendLabel:document.querySelector('#coachSend')?.getAttribute('aria-label'),
   overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
  };
 });
 if(result.title!=='המאמן האישי של דביר'||!result.labels.includes('אתה')||!result.labels.includes('המאמן האישי'))throw new Error(`${theme}: premium coach identity failed ${JSON.stringify(result)}`);
 if(result.inputLabel!=='כתיבת הודעה למאמן'||result.sendLabel!=='שלח הודעה למאמן')throw new Error(`${theme}: composer labels failed ${JSON.stringify(result)}`);
 for(const [name,target] of Object.entries({send:result.send,voice:result.voice,photo:result.photo}))if(!target||target.width<44||target.height<44)throw new Error(`${theme}: ${name} touch target failed ${JSON.stringify(target)}`);
 if(!result.composer||!result.dock||result.composer.bottom>result.dock.top+1)throw new Error(`${theme}: composer overlaps navigation ${JSON.stringify(result)}`);
 if(result.overflow>1)throw new Error(`${theme}: horizontal overflow ${result.overflow}`);
 if(theme!=='night'&&(!result.ai?.color.includes('21, 43, 63')||!result.user?.color.includes('255, 255, 255')))throw new Error(`${theme}: message contrast styles failed ${JSON.stringify(result)}`);
 if(errors.length)throw new Error(`${theme}: runtime errors ${errors.join(' | ')}`);
 console.log(`Premium coach ${theme} OK`,result);
 await context.close();
}

await browser.close();
