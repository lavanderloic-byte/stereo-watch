const endpoint='https://mmuqrizmpfqgyajgcfwa.supabase.co/functions/v1/stereo-watch-gateway';
let running=false;
async function api(action,body){const s=await chrome.storage.session.get('key'),l=await chrome.storage.local.get('key');const key=s.key||l.key;if(!key)throw Error('请在扩展中输入网页访问码');const r=await fetch(endpoint+'?action='+action+'&forceFunctionRegion=ap-northeast-2',{method:'POST',headers:{'Content-Type':'application/json','x-stereo-key':key},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'云端连接失败');return d;}
async function note(lastStatus){await chrome.storage.local.set({lastStatus});}
async function message(tabId,body){for(let i=0;i<(body.type==='submit'?1:45);i++){try{return await chrome.tabs.sendMessage(tabId,body);}catch{if(body.type==='submit')throw Error('提交结果未知，已停止自动重试，请核对学校预约记录');await new Promise(r=>setTimeout(r,1000));}}throw Error('学校页面未能加载；请检查网络和登录');}
async function update(job,status,extra={}){return api('worker-update',{id:job.id,worker:job.worker_id,status,...extra});}
async function prepare(job){const prepared=[];try{
 for(const group of job.plan.groups){let selected;
  for(const machine of group.candidates){const tab=await chrome.tabs.create({url:machine.url,active:false});const resource={...machine,start:group.start,end:group.end,content:job.plan.content,sampleCount:job.plan.sampleCount};
   const result=await message(tab.id,{type:'prepare',resource});
   if(result.ok){selected={...resource,...result,tabId:tab.id};break;}
   await chrome.tabs.remove(tab.id);
   if(result.code!=='busy')throw Error(machine.name+'：'+result.error);
  }
  if(!selected)throw Error('优先设备在请求时段没有空位；换地点需要你确认');prepared.push(selected);
 }
 await chrome.storage.local.set({['prepared:'+job.id]:prepared});await update(job,'awaiting_confirmation',{prepared});await note('已核实并填好预约，等待网页上的本次条款确认');
 }catch(e){await update(job,'blocked',{error:String(e.message||e),prepared});await note(String(e.message||e));}}
async function submit(job){const saved=(await chrome.storage.local.get('prepared:'+job.id))['prepared:'+job.id];if(!saved||saved.length!==job.prepared.length){await update(job,'uncertain',{error:'本机准备状态丢失。请人工核对；未自动重新提交。'});return;}
 const results=[];try{
 // Revalidate every prepared document before any resource is submitted.
 for(const resource of saved){const check=await message(resource.tabId,{type:'validate',resource});if(!check.ok||check.fingerprint!==resource.fingerprint)throw Error('学校确认页面已变化，请重新核对，未自动重试');}
 for(const resource of saved){
  const result=await message(resource.tabId,{type:'submit',resource,authorized:true});
  if(!result.ok)throw Error(result.error||'学校提交结果不确定');
  // A new read-only records page is used to verify instrument and exact times.
  const recordTab=await chrome.tabs.create({url:'https://instrumentsharelab.hkust-gz.edu.cn/Console/UsedConfirm/AppointmentInfoIndex?noRemember=1',active:false});
  const record=await message(recordTab.id,{type:'verify',resource});
  if(!record.ok)throw Error('学校可能已接受提交，但预约记录尚未核实；请人工核对，勿重复预约');
  results.push({id:resource.id,name:resource.name,start:resource.start,end:resource.end,status:record.status,bookingId:record.bookingId});await chrome.tabs.remove(recordTab.id);
 }
 const pending=results.some(r=>r.status==='pending_review');await update(job,pending?'partial':'completed',{results,error:pending?'预约已提交并回查编号，其中有设备等待学校审核':''});await note(pending?'预约已提交，等待学校审核':'预约已完成，编号已回查');
 }catch(e){await update(job,results.length?'partial':'uncertain',{results,error:String(e.message||e)});await note(String(e.message||e));}}
async function tick(){if(running)return;running=true;try{const {enabled}=await chrome.storage.local.get('enabled');if(!enabled)return;let {worker}=await chrome.storage.local.get('worker');if(!worker){worker=crypto.randomUUID();await chrome.storage.local.set({worker});}const {job}=await api('worker-claim',{worker});if(job){if(job.status==='preparing')await prepare(job);else if(job.status==='submitting')await submit(job);}else await note('在线，等待网页任务');}catch(e){await note(String(e.message||e));}finally{running=false;}}
chrome.runtime.onInstalled.addListener(()=>chrome.alarms.create('poll',{periodInMinutes:1}));
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create('poll',{periodInMinutes:1});tick();});
chrome.alarms.onAlarm.addListener(()=>tick());
chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(m.type==='connect'){(async()=>{await chrome.storage.session.set({key:m.key});if(m.remember)await chrome.storage.local.set({key:m.key});else await chrome.storage.local.remove('key');await chrome.storage.local.set({enabled:true});await chrome.alarms.create('poll',{periodInMinutes:1});await tick();reply({ok:true});})();return true;}if(m.type==='stop'){chrome.storage.local.set({enabled:false}).then(()=>reply({ok:true}));return true;}});
