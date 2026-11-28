import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MemoryStore} from '../server/store.mjs';
import {encrypt} from '../server/security.mjs';
import {synchronize} from '../server/sync.mjs';
import {jobSignature,validJob,enqueueImport,runImport} from '../server/import-job.mjs';
const env={ADVENTURESDISPLAY_MODE:'household',CONFIG_ENCRYPTION_KEY:'f'.repeat(64),URL:'https://frame.example'};
test('large imports publish ready photos, resume from checkpoints and do not report pending work as failure',async()=>{
 const store=new MemoryStore();await store.setJSON('configuration',encrypt({photoSource:'https://bridge.example/manifest',calendars:[]},env.CONFIG_ENCRYPTION_KEY));
 const raw=await readFile(new URL('../public/photos/lake.jpg',import.meta.url));const manifest={complete:true,photos:Array.from({length:11},(_,i)=>({id:'photo-'+i,version:'1',url:'https://bridge.example/photo-'+i}))};let reads=0;
 const fetcher=async url=>url.endsWith('manifest')?Buffer.from(JSON.stringify(manifest)):(reads++,raw);
 let snapshot=await synchronize(store,env,{fetcher});assert.equal(snapshot.photos.length,8);assert.equal(snapshot.stale,false);assert.equal(snapshot.sourceStatus.photos,'importing');assert.deepEqual(snapshot.photoProgress,{ready:8,total:11,skipped:0});
 snapshot=await synchronize(store,env,{fetcher});assert.equal(snapshot.photos.length,11);assert.equal(reads,11);assert.equal(snapshot.sourceStatus.photos,'ok');assert.equal(snapshot.stale,false);
 manifest.complete=false;manifest.photos=[];snapshot=await synchronize(store,env,{fetcher});assert.equal(snapshot.photos.length,11);assert.equal(snapshot.sourceStatus.photos,'unavailable');
});
test('an unavailable photo is retried later and cannot block other album items',async()=>{
 const store=new MemoryStore();await store.setJSON('configuration',encrypt({photoSource:'https://bridge.example/manifest',calendars:[]},env.CONFIG_ENCRYPTION_KEY));const raw=await readFile(new URL('../public/photos/lake.jpg',import.meta.url));let failedReads=0;
 const manifest={complete:true,photos:Array.from({length:3},(_,i)=>({id:'item-'+i,version:'1',url:'https://bridge.example/'+i}))};
 const fetcher=async url=>{if(url.endsWith('manifest'))return Buffer.from(JSON.stringify(manifest));if(url.endsWith('/0')){failedReads++;throw Error('unavailable');}return raw;};
 for(let pass=0;pass<2;pass++){const snapshot=await synchronize(store,env,{fetcher});assert.equal(snapshot.photos.length,2);assert.equal(snapshot.sourceStatus.photos,'partial');}assert.equal(failedReads,1);
});
test('background jobs require a fresh signed POST and dispatch only to the configured site',async()=>{
 const time=String(Date.now()),headers={'x-import-time':time,'x-import-signature':jobSignature(env,time)};
 assert.equal(validJob(new Request('https://frame.example/job',{method:'POST',headers}),env),true);
 assert.equal(validJob(new Request('https://frame.example/job',{headers}),env),false);
 assert.equal(validJob(new Request('https://frame.example/job',{method:'POST'}),env),false);
 assert.equal(validJob(new Request('https://frame.example/job',{method:'POST',headers}),env,Number(time)+360000),false);
 await enqueueImport(env,async(url,options)=>{assert.equal(String(url),'https://frame.example/.netlify/functions/import-background');assert.equal(validJob(new Request(url,options),env),true);return new Response(null,{status:202});});
});
test('background imports drain pending batches, prevent overlap and release their lock',async()=>{
 const store=new MemoryStore();let passes=0;const result=await runImport(store,env,{sync:async()=>({sourceStatus:{photos:++passes<3?'importing':'ok'}})});assert.equal(passes,3);assert.equal(result.sourceStatus.photos,'ok');assert.equal(await store.get('import-lock'),null);
 let release,entered;const ready=new Promise(r=>entered=r);const first=runImport(store,env,{sync:async()=>{entered();await new Promise(r=>release=r);return {sourceStatus:{photos:'ok'}};}});await ready;assert.deepEqual(await runImport(store,env),{running:true});release();await first;
 await assert.rejects(runImport(store,env,{sync:async()=>{throw Error('interrupted');}}));assert.equal(await store.get('import-lock'),null);
});

test('failed replacement media preserves its last working version',async()=>{
 const store=new MemoryStore();await store.setJSON('configuration',encrypt({photoSource:'https://bridge.example/manifest',calendars:[]},env.CONFIG_ENCRYPTION_KEY));const raw=await readFile(new URL('../public/photos/lake.jpg',import.meta.url));const image={id:'stable-photo',version:'1',url:'https://bridge.example/image'};let failed=false;
 const fetcher=async url=>{if(url.endsWith('manifest'))return Buffer.from(JSON.stringify({complete:true,photos:[image]}));if(failed)throw Error('unavailable');return raw;};const first=await synchronize(store,env,{fetcher});image.version='2';failed=true;const next=await synchronize(store,env,{fetcher});assert.equal(next.photos.length,1);assert.equal(next.photos[0].id,first.photos[0].id);assert.equal(next.sourceStatus.photos,'partial');assert.ok(await store.get('photos/'+first.photos[0].id));
});
