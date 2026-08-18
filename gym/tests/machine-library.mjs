import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/';
const viewports=[
 {name:'mobile',width:390,height:844,expectedColumns:2},
 {name:'desktop',width:1440,height:1000,expectedColumns:3}
];
const browser=await chromium.launch({headless:true});

for(const viewport of viewports){
 const context=await browser.newContext({viewport,locale:'he-IL'});
 await context.addInitScript(()=>{
  const state={version:'9.2.0',profile:{name:'Gym QA',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[]};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
 });
 const page=await context.newPage(),errors=[],failed=[];
 const domClick=selector=>page.locator(selector).evaluate(el=>el.click());
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.url().includes('/assets/gym-machines.webp')&&r.status()!==200)failed.push(`${r.status()} ${r.url()}`)});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body.ready',{timeout:30000});
 if(await page.locator('#onboardDialog[open]').count())throw new Error(`${viewport.name}: onboarding unexpectedly blocked a completed profile`);
 await page.locator('[data-screen="more"]').evaluate(el=>el.click());
 await page.waitForSelector('#screen-more.active');
 await page.waitForSelector('.dg-machine-card-v91');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.dg-machine-photo')).backgroundImage.includes('gym-machines.webp'));
 const library=await page.evaluate(()=>{
  const grid=document.querySelector('#machineGrid'),cards=[...grid.querySelectorAll('.dg-machine-card-v91')],r=grid.getBoundingClientRect();
  return{count:cards.length,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,photoCards:cards.filter(x=>x.querySelector('.dg-real-photo-badge')).length,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,grid:{left:r.left,right:r.right,width:r.width},details:MACHINES.map(m=>({id:m.id,tip:m.tip,bestFor:m.bestFor,programUse:m.programUse,isCardio:m.isCardio}))};
 });
 if(library.count!==20||library.photoCards!==20)throw new Error(`${viewport.name}: expected 20 authentic-photo cards: ${JSON.stringify(library)}`);
 if(library.columns!==viewport.expectedColumns)throw new Error(`${viewport.name}: wrong grid columns ${library.columns}`);
 if(library.overflow>1||library.grid.left<0||library.grid.right>viewport.width+1)throw new Error(`${viewport.name}: horizontal overflow ${JSON.stringify(library)}`);
 if(library.details.some(x=>!x.tip||!x.bestFor||!x.programUse))throw new Error(`${viewport.name}: incomplete equipment card data`);
 if(library.details.filter(x=>x.isCardio).length!==6)throw new Error(`${viewport.name}: expected six cardio machines`);
 await domClick('[data-machine="chest-press"]');
 await page.waitForSelector('#machineDialog[open] .dg-machine-modal-v91');
 let modal=await page.locator('#machineDialog').innerText();
 for(const label of ['שרירים ומערכת','כיוון והכנה','ביצוע נכון','טיפ מקצועי','אזהרה וטעות נפוצה','שילוב בתוכנית','למי מתאים'])if(!modal.includes(label))throw new Error(`${viewport.name}: missing modal field ${label}`);
 await domClick('#dgMachineClose');
 await domClick('[data-dg-machine-filter="cardio"]');
 if(await page.locator('.dg-machine-card-v91').count()!==6)throw new Error(`${viewport.name}: cardio filter failed`);
 await domClick('[data-machine="treadmill"]');
 modal=await page.locator('#machineDialog').innerText();
 if(!modal.includes('5–8 דקות')||!modal.includes('יום התאוששות'))throw new Error(`${viewport.name}: treadmill program guidance missing`);
 await domClick('#dgMachineClose');
 await page.evaluate(()=>{S.location='gym';S.activeWorkout={id:'qa-upper',title:'Upper A',type:'upperA',location:'gym',currentIndex:0,exercises:[{exerciseId:'chest-press',name:'Chest Press',sets:3,reps:'6–10',restSec:120,targetRIR:2,results:[]}]};save();openWorkout()});
 await page.waitForSelector('#dgConditioningProtocol');
 const warmup=await page.locator('#dgConditioningProtocol').innerText();
 if(!warmup.includes('4–6 דקות')||!warmup.includes('Stair Climber'))throw new Error(`${viewport.name}: upper cardio protocol missing`);
 if(errors.length||failed.length)throw new Error(`${viewport.name}: runtime/network errors ${[...errors,...failed].join(' | ')}`);
 await context.close();
 console.log(`Gym equipment library ${viewport.name} OK`,library);
}

await browser.close();
