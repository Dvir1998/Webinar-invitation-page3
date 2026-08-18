import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});

for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
 const context=await browser.newContext({viewport,locale:'he-IL',reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  if(localStorage.getItem('dvirAthleteOS_v8::guest'))return;
  const state={version:'9.2.0',profile:{name:'דביר',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28,dietStyle:'הכול',likes:'',dislikes:'',allergies:'',creatine:true},location:'gym',prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[],reminders:[],daily:{date:new Date().toISOString().slice(0,10),creatine:false,proteinChecked:false}};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body.ready',{timeout:30000});
 await page.waitForSelector('#dgDailyTrackerV92');

 const protein=page.getByRole('button',{name:/חלבון: לא בוצע/});
 const creatine=page.getByRole('button',{name:/קריאטין: לא בוצע/});
 await protein.click();await creatine.click();
 if(await page.getByRole('button',{name:/חלבון: בוצע/}).getAttribute('aria-pressed')!=='true'||await page.getByRole('button',{name:/קריאטין: בוצע/}).getAttribute('aria-pressed')!=='true')throw new Error(`${viewport.name}: daily toggles did not update`);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('body.ready',{timeout:30000});await page.waitForSelector('#dgDailyTrackerV92');
 if(await page.getByRole('button',{name:/חלבון: בוצע/}).getAttribute('aria-pressed')!=='true')throw new Error(`${viewport.name}: protein did not persist`);
 if(await page.getByRole('button',{name:/קריאטין: בוצע/}).getAttribute('aria-pressed')!=='true')throw new Error(`${viewport.name}: creatine did not persist`);

 await page.evaluate(()=>{
  S.location='gym';
  S.activeWorkout={id:'recovery-e2e',title:'Upper A',type:'upperA',location:'gym',currentIndex:1,createdAt:Date.now()-45*60*1000,estimatedMinutes:45,exercises:[{exerciseId:'chest-press',name:'Chest Press',sets:1,reps:'8–12',restSec:90,targetRIR:2,results:[{weight:30,reps:10,rir:2,done:true}]}]};
  save();openWorkout();
 });
 await page.getByRole('button',{name:/סיים, שמור ועבור להתאוששות/}).click();
 await page.waitForSelector('#dgRecoveryDialogV92[open]');
 const dialog=page.locator('#dgRecoveryDialogV92'),text=await dialog.innerText();
 if(!text.includes('האימון הושלם')||!text.includes('במכון')||!text.includes('גרם חלבון'))throw new Error(`${viewport.name}: recovery context missing`);
 if(await dialog.locator('.dg-recovery-option').count()!==3)throw new Error(`${viewport.name}: expected three recovery options`);
 const recoveryTitleColor=await dialog.locator('.dg-recovery-option h4').first().evaluate(element=>getComputedStyle(element).color);
 if(recoveryTitleColor!=='rgb(19, 34, 56)')throw new Error(`${viewport.name}: light recovery title contrast failed ${recoveryTitleColor}`);
 const proteins=await dialog.locator('.dg-recovery-option').evaluateAll(nodes=>nodes.map(n=>Number((n.innerText.match(/(\d+) גרם חלבון/)||[])[1])));
 if(proteins.some(x=>!x||x<25))throw new Error(`${viewport.name}: weak protein option ${proteins.join(',')}`);
 await dialog.getByRole('button',{name:'תעד שאכלתי'}).first().click();
 await page.waitForFunction(()=>S.meals.some(m=>m.source==='post-workout-plan')&&S.dailyTracking[dayKey(Date.now())]?.workout===true&&S.dailyTracking[dayKey(Date.now())]?.recoveryMeal===true);
 const saved=await page.evaluate(()=>({meals:S.meals.filter(m=>m.source==='post-workout-plan').length,points:S.recoveryGame.points,plan:S.postWorkoutPlans[0],day:S.dailyTracking[dayKey(Date.now())]}));
 if(saved.meals!==1||saved.points!==40||!saved.plan.loggedMealId||!saved.day.protein)throw new Error(`${viewport.name}: recovery log state failed ${JSON.stringify(saved)}`);
 await dialog.getByRole('button',{name:'סגור המלצת התאוששות'}).click();
 await page.locator('[data-screen="home"]').click();
 if(await page.getByRole('button',{name:/אימון: בוצע/}).getAttribute('aria-pressed')!=='true')throw new Error(`${viewport.name}: workout did not auto-complete`);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('body.ready',{timeout:30000});
 await page.locator('[data-screen="fuel"]').click();await page.waitForSelector('#dgRecoveryCardV92.logged');
 if(!(await page.locator('#dgRecoveryCardV92').innerText()).includes('ההתאוששות תועדה'))throw new Error(`${viewport.name}: recovery card did not persist`);
 const variants=await page.evaluate(()=>{
  const morning=new Date();morning.setHours(8,15,0,0);const evening=new Date();evening.setHours(19,30,0,0);
  const a=dgBuildPostWorkoutPlanV92({id:'morning-gym',finishedAt:+morning,location:'gym',type:'upperA',title:'Upper A'});
  const b=dgBuildPostWorkoutPlanV92({id:'evening-home',finishedAt:+evening,location:'home',type:'lowerB',title:'Lower B'});
  return{morning:{slot:a.slot,location:a.location,ids:a.options.map(x=>x.id)},evening:{slot:b.slot,location:b.location,ids:b.options.map(x=>x.id)}};
 });
 if(variants.morning.slot!=='morning'||variants.morning.location!=='gym'||variants.evening.slot!=='evening'||variants.evening.location!=='home')throw new Error(`${viewport.name}: contextual variants failed ${JSON.stringify(variants)}`);
 if(variants.morning.ids.join(',')===variants.evening.ids.join(','))throw new Error(`${viewport.name}: meal variants are not diverse`);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 if(overflow>1)throw new Error(`${viewport.name}: horizontal overflow ${overflow}`);
 if(errors.length)throw new Error(`${viewport.name}: runtime errors ${errors.join(' | ')}`);
 await context.close();
 console.log(`Daily tracker and recovery ${viewport.name} OK`,saved,variants);
}

await browser.close();
