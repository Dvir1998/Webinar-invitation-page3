import { chromium } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const viewports=[
 {name:'mobile',width:390,height:844,expectedColumns:2},
 {name:'desktop',width:1440,height:1000,expectedColumns:3}
];
const browser=await chromium.launch({headless:true});

for(const viewport of viewports){
 const context=await browser.newContext({viewport,locale:'he-IL'});
 await context.addInitScript(()=>{
  const state={version:'9.3.1',appVersion:'9.3.1',profile:{name:'Gym QA',complete:true,days:4,goal:'lean_gain',weight:65,height:165,age:28},prefs:{theme:'bright'},logs:[],meals:[],weights:[],measures:[],chat:[],photos:[]};
  localStorage.setItem('dvirGymMultiWelcomeV8','1');
  localStorage.setItem('dvirAthleteOS_v6',JSON.stringify(state));
  localStorage.setItem('dvirAthleteOS_v8::guest',JSON.stringify(state));
 });
 const page=await context.newPage(),errors=[],failed=[];
 const domClick=selector=>page.locator(selector).evaluate(el=>el.click());
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.url().includes('/assets/gym-photos/')&&r.status()!==200)failed.push(`${r.status()} ${r.url()}`)});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('body.ready',{timeout:30000});
 if(await page.locator('#onboardDialog[open]').count())throw new Error(`${viewport.name}: onboarding unexpectedly blocked a completed profile`);
 await page.locator('[data-screen="more"]').evaluate(el=>el.click());
 await page.waitForSelector('#screen-more.active');
 await page.waitForSelector('.dg-machine-card-v94 .dg-gym-photo-v94');

 const decoded=await page.evaluate(async()=>{
  const entries=Object.entries(DG_GYM_PHOTO_LIBRARY_V94).flatMap(([machine,keys])=>keys.map(key=>({machine,key})));
  const results=await Promise.all(entries.map(async({machine,key})=>{
   const image=new Image();image.src=dgGymPhotoPathV94(key,'thumb');await image.decode();
   return{machine,key,width:image.naturalWidth,height:image.naturalHeight,portrait:DG_GYM_PORTRAIT_PHOTOS_V94.has(key)};
  }));
  return{ready:DG_GYM_PHOTO_LIBRARY_READY_V94,total:DG_GYM_PHOTO_TOTAL_V94,results};
 });
 if(!decoded.ready||decoded.total!==32||decoded.results.length!==32)throw new Error(`${viewport.name}: source photo library incomplete ${JSON.stringify(decoded)}`);
 for(const photo of decoded.results){
  const expected=photo.portrait?{width:720,height:1280}:{width:720,height:406};
  if(photo.width!==expected.width||photo.height!==expected.height)throw new Error(`${viewport.name}: thumbnail dimensions failed ${JSON.stringify(photo)}`);
 }

 while(await page.locator('#dgMachineLoadMoreV931').count())await page.locator('#dgMachineLoadMoreV931').evaluate(button=>button.click());
 const library=await page.evaluate(()=>{
  const grid=document.querySelector('#machineGrid'),cards=[...grid.querySelectorAll('.dg-machine-card-v94')],r=grid.getBoundingClientRect();
  return{
   count:cards.length,
   columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
   sourcePhotoCards:cards.filter(x=>x.querySelector('.dg-source-photo-v94')).length,
   legacyPhotos:cards.filter(x=>x.querySelector('.dg-legacy-photo-v94')).length,
   missingPhotos:cards.filter(x=>x.querySelector('.dg-photo-unavailable-v931')).length,
   photoTotal:DG_GYM_PHOTO_TOTAL_V94,
   libraryReady:DG_GYM_PHOTO_LIBRARY_READY_V94,
   overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   grid:{left:r.left,right:r.right,width:r.width},
   details:MACHINES.map(m=>({id:m.id,tip:m.tip,bestFor:m.bestFor,programUse:m.programUse,isCardio:m.isCardio,anatomy:m.anatomy}))
  };
 });
 if(library.count!==23||library.sourcePhotoCards!==22||library.legacyPhotos!==1||library.missingPhotos!==0||library.photoTotal!==32||!library.libraryReady)throw new Error(`${viewport.name}: equipment/photo coverage failed ${JSON.stringify(library)}`);
 if(library.columns!==viewport.expectedColumns)throw new Error(`${viewport.name}: wrong grid columns ${library.columns}`);
 if(library.overflow>1||library.grid.left<0||library.grid.right>viewport.width+1)throw new Error(`${viewport.name}: horizontal overflow ${JSON.stringify(library)}`);
 if(library.details.some(x=>!x.tip||!x.bestFor||!x.programUse||!x.anatomy?.primary||!x.anatomy?.secondary||!x.anatomy?.purpose))throw new Error(`${viewport.name}: incomplete equipment guidance`);
 if(library.details.filter(x=>x.isCardio).length!==6)throw new Error(`${viewport.name}: expected six cardio machines`);

 await domClick('[data-machine="cable"]');
 await page.waitForSelector('#machineDialog[open] .dg-machine-modal-v94');
 if(await page.locator('#machineDialog .dg-machine-gallery-v94 img').count()!==3)throw new Error(`${viewport.name}: cable gallery does not contain three source photos`);
 const gallery=await page.locator('#machineDialog .dg-machine-gallery-v94 img').evaluateAll(async images=>{
  await Promise.all(images.map(image=>image.decode()));
  return images.map(image=>({src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight}));
 });
 if(gallery.some(x=>!x.src.includes('assets/gym-photos/thumb/')||x.width!==720||x.height!==1280))throw new Error(`${viewport.name}: immediate source gallery decode failed ${JSON.stringify(gallery)}`);
 await page.locator('#machineDialog [data-dg-gym-photo]').first().evaluate(el=>el.click());
 await page.waitForSelector('#dgGymPhotoZoomV94[open] img');
 const zoom=await page.locator('#dgGymPhotoZoomV94 img').evaluate(async image=>{await image.decode();return{width:image.naturalWidth,height:image.naturalHeight,src:image.getAttribute('src')}});
 if(zoom.width!==1800||zoom.height!==3200||!zoom.src.includes('assets/gym-photos/full/'))throw new Error(`${viewport.name}: zoom source photo failed ${JSON.stringify(zoom)}`);
 await domClick('#dgGymPhotoZoomV94 .close');
 await domClick('#dgMachineClose');

 await domClick('[data-machine="chest-press"]');
 await page.waitForSelector('#machineDialog[open] .dg-machine-modal-v94');
 if(!await page.locator('#machineDialog .dg-machine-gallery-v94 button.dg-source-photo-v94').count())throw new Error(`${viewport.name}: gallery backdrop is missing`);
 let modal=await page.locator('#machineDialog').innerText();
 for(const label of ['שרירים עיקריים','שרירים מסייעים','כיוון והכנה','ביצוע נכון','טיפ מקצועי','אזהרה וטעות נפוצה','שילוב בתוכנית','למי מתאים'])if(!modal.includes(label))throw new Error(`${viewport.name}: missing modal field ${label}`);
 if(process.env.DG_MACHINE_SCREENSHOT)await page.screenshot({path:process.env.DG_MACHINE_SCREENSHOT.replace('{name}',viewport.name)});
 await domClick('#dgMachineClose');
 await domClick('[data-dg-machine-filter="cardio"]');
 if(await page.locator('.dg-machine-card-v94').count()!==6)throw new Error(`${viewport.name}: cardio filter failed`);
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
