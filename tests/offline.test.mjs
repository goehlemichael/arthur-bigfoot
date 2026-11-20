import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,readdir} from 'node:fs/promises';
import {VERSION} from '../site/game.js';
const source=await readFile(new URL('../site/sw.js',import.meta.url),'utf8');
function fixture(){
 const handlers={},cacheStores=new Map(),scope='https://example.test/arthur-bigfoot/';let claimed=false,activated=false;
 const key=x=>typeof x==='string'?x:x.url;
 const caches={keys:async()=>[...cacheStores.keys()],delete:async k=>cacheStores.delete(k),open:async name=>{if(!cacheStores.has(name))cacheStores.set(name,new Map());const map=cacheStores.get(name);return{addAll:async requests=>{for(const r of requests)map.set(key(r),new Response('cached '+key(r)))},match:async request=>map.get(key(request))?.clone()}}};
 const self={registration:{scope},location:{origin:'https://example.test'},clients:{claim:async()=>{claimed=true}},skipWaiting:async()=>{activated=true},addEventListener:(type,handler)=>handlers[type]=handler};
 vm.runInNewContext(source,{self,caches,URL,Request,Promise,fetch:async()=>{throw new Error('offline')}});
 async function fire(type,extra={}){let result;handlers[type]({...extra,waitUntil:p=>{result=p},respondWith:p=>{result=p}});return await result}
 return{fire,cacheStores,scope,get claimed(){return claimed},get activated(){return activated}};
}
test('offline installation populates a complete path-scoped cache',async()=>{const f=fixture();await f.fire('install');const names=[...f.cacheStores.keys()];assert.equal(names.length,1);assert.ok(names[0].startsWith('arthur:/arthur-bigfoot/:'));let result;await f.fire('message',{data:{type:'CHECK_CACHE'},ports:[{postMessage:v=>result=v}]});assert.equal(result.ready,true);assert.equal(result.version,VERSION)});
test('incomplete cache is not declared offline ready',async()=>{const f=fixture();await f.fire('install');[...f.cacheStores.values()][0].delete(f.scope+'world.js');let result;await f.fire('message',{data:{type:'CHECK_CACHE'},ports:[{postMessage:v=>result=v}]});assert.equal(result.ready,false)});
test('cached runtime is served when fetch is offline',async()=>{const f=fixture();await f.fire('install');const response=await f.fire('fetch',{request:new Request(f.scope+'main.js')});assert.match(await response.text(),/cached.*main.js/)});
test('offline navigation returns cached entry point',async()=>{const f=fixture();await f.fire('install');const response=await f.fire('fetch',{request:{url:f.scope+'?resume=1',method:'GET',mode:'navigate'}});assert.match(await response.text(),/index.html/)});
test('updates do not activate during installation',async()=>{const f=fixture();await f.fire('install');assert.equal(f.activated,false);await f.fire('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(f.activated,true)});
test('activation keeps unrelated project caches',async()=>{const f=fixture();f.cacheStores.set('another-game',new Map());f.cacheStores.set('arthur:/other/:v1',new Map());f.cacheStores.set('arthur:/arthur-bigfoot/:old1',new Map());f.cacheStores.set('arthur:/arthur-bigfoot/:old2',new Map());await f.fire('install');await f.fire('activate');assert.ok(f.cacheStores.has('another-game'));assert.ok(f.cacheStores.has('arthur:/other/:v1'));assert.ok(!f.cacheStores.has('arthur:/arthur-bigfoot/:old1'));assert.ok(f.claimed)});
test('foreign and out-of-scope requests are left alone',async()=>{const f=fixture();assert.equal(await f.fire('fetch',{request:new Request('https://elsewhere.test/a')}),undefined);assert.equal(await f.fire('fetch',{request:new Request('https://example.test/other/a')}),undefined)});
test('every runtime module and stylesheet is listed in offline assets',async()=>{const files=await readdir(new URL('../site/',import.meta.url));for(const name of files.filter(n=>(n.endsWith('.js')||n.endsWith('.css'))&&n!=='sw.js'))assert.ok(source.includes("'./"+name+"'"),name)});
test('cache and game versions match',async()=>{const game=await readFile(new URL('../site/game.js',import.meta.url),'utf8');assert.equal(source.match(/VERSION='([^']+)'/)[1],game.match(/VERSION='([^']+)'/)[1])});
test('missing bunker module prevents an offline-ready result',async()=>{const f=fixture();await f.fire('install');[...f.cacheStores.values()][0].delete(f.scope+'bunker.js');let result;await f.fire('message',{data:{type:'CHECK_CACHE'},ports:[{postMessage:v=>result=v}]});assert.equal(result.ready,false)});
