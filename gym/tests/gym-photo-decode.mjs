import { webkit } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const browser=await webkit.launch({headless:true});
const page=await browser.newPage();
const failed=[];
page.on('response',response=>{
 if(response.url().includes('/assets/gym-machines-2x.webp')&&response.status()!==200)failed.push(`${response.status()} ${response.url()}`);
});
await page.goto(base,{waitUntil:'domcontentloaded'});
const sprite=await page.evaluate(async()=>{
 const image=new Image();
 image.src='assets/gym-machines-2x.webp?webkit-decode-test=1';
 await image.decode();
 return{complete:image.complete,width:image.naturalWidth,height:image.naturalHeight};
});
if(!sprite.complete||sprite.width!==960||sprite.height!==1600||failed.length)throw new Error(`WebKit 2x gym photo decode failed ${JSON.stringify({sprite,failed})}`);
console.log('WebKit 2x gym photo decode OK',sprite);
await browser.close();
