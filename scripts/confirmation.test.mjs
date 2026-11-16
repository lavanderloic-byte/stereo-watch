import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const script=readFileSync(new URL('../extension/school.js',import.meta.url),'utf8');
const resource={start:'2030-11-16T13:00+08:00',end:'2030-11-16T13:15+08:00'};
const order='设备信息\n冰箱B2\n预约信息\n样本1 项目A\n预约时间及费用\n2030-11-16 13:00~13:15\n0元\n设备使用说明\n条款原文\n我已仔细阅读并同意以上条款';
async function inspect(body){let listener;const ctx=vm.createContext({crypto:webcrypto,TextEncoder,setTimeout,Date,URL,document:{body:{innerText:body},querySelector:selector=>selector==='#submitBooking'?{getClientRects:()=>[{}]}:null},chrome:{runtime:{onMessage:{addListener:fn=>{listener=fn;}}}}});vm.runInContext(script,ctx);return new Promise(resolve=>listener({type:'validate',resource},{},resolve));}
test('confirmation ignores unrelated navigation, footer and loading text',async()=>{const a=await inspect('导航\n'+order+'\n加载中');const b=await inspect('新导航\n'+order+'\nCopyright 2030');assert.equal(a.ok,true);assert.equal(a.fingerprint,b.fingerprint);});
test('confirmation still detects changes to price, identity or full terms',async()=>{const a=await inspect(order);for(const changed of [order.replace('0元','10元'),order.replace('项目A','项目B'),order.replace('条款原文','条款新增责任')]){const b=await inspect(changed);assert.equal(b.ok,true);assert.notEqual(a.fingerprint,b.fingerprint);}});
test('missing confirmation structure fails closed',async()=>{const a=await inspect(order.replace('设备使用说明','未知结构'));assert.equal(a.ok,false);});
