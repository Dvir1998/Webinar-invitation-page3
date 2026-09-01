import { webkit } from 'playwright';

const base=process.env.DG_TEST_BASE||'http://127.0.0.1:4173/';
const browser=await webkit.launch({headless:true});
const page=await browser.newPage();
const failed=[];
page.on('response',response=>{
 if(response.url().includes('/assets/gym-photos/')&&response.status()!==200)failed.push(`${response.status()} ${response.url()}`);
});
await page.goto(base,{waitUntil:'domcontentloaded'});
const result=await page.evaluate(async()=>{
 const response=await fetch('assets/gym-photos/manifest.json?decode-test=1',{cache:'no-store'});
 if(!response.ok)throw new Error(`manifest ${response.status}`);
 const manifest=await response.json();
 const decode=async path=>{
  const image=new Image();image.src=`${path}?webkit-decode-test=1`;await image.decode();
  return{complete:image.complete,width:image.naturalWidth,height:image.naturalHeight};
 };
 const thumbs=await Promise.all(manifest.photos.map(async photo=>({
  key:photo[0],
  expected:photo[2]<photo[3]?{width:720,height:1280}:{width:720,height:406},
  actual:await decode(`assets/gym-photos/thumb/${photo[0]}.webp`)
 })));
 return{
  receivedFiles:manifest.receivedFiles,
  uniquePhotos:manifest.uniquePhotos,
  photos:manifest.photos.length,
  thumbs,
  landscape:await decode('assets/gym-photos/full/leg-extension-1.webp'),
  portrait:await decode('assets/gym-photos/full/rower-1.webp')
 };
});
if(result.receivedFiles!==33||result.uniquePhotos!==32||result.photos!==32)throw new Error(`WebKit manifest coverage failed ${JSON.stringify(result)}`);
for(const thumb of result.thumbs)if(!thumb.actual.complete||thumb.actual.width!==thumb.expected.width||thumb.actual.height!==thumb.expected.height)throw new Error(`WebKit thumbnail decode failed ${JSON.stringify(thumb)}`);
if(!result.landscape.complete||result.landscape.width!==3200||result.landscape.height!==1800)throw new Error(`WebKit landscape decode failed ${JSON.stringify(result.landscape)}`);
if(!result.portrait.complete||result.portrait.width!==1800||result.portrait.height!==3200)throw new Error(`WebKit portrait decode failed ${JSON.stringify(result.portrait)}`);
if(failed.length)throw new Error(`WebKit gym photo requests failed ${failed.join(' | ')}`);
console.log('WebKit source-faithful gym photo library OK',{received:result.receivedFiles,unique:result.uniquePhotos,decodedThumbs:result.thumbs.length,landscape:result.landscape,portrait:result.portrait});
await browser.close();
