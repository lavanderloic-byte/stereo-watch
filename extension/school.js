(()=>{
 const visible=e=>!!e&&!!e.getClientRects().length;
 const wait=async(fn,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){const r=fn();if(r)return r;await new Promise(r=>setTimeout(r,250));}throw Error('学校页面未按预期加载，请检查登录、权限或页面提示');};
 const text=()=>document.body.innerText;
 const stamp=t=>t.slice(0,16).replace('T',' ');
 const fingerprint=async()=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text()));return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');};
 const set=(selector,value)=>{const e=document.querySelector(selector);if(!visible(e))throw Error('缺少预约必填字段：'+selector);e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
 const validate=async r=>{if(Date.parse(r.start)<Date.now()+5*60000)throw Error('开始时间已临近或过去，请重新安排');if(!visible(document.querySelector('#submitBooking')))throw Error('学校确认页已失效');const t=text();if(!t.includes(r.start.slice(0,10))||!t.includes(r.start.slice(11,16))||!t.includes(r.end.slice(11,16)))throw Error('学校确认时间与任务不一致');return {ok:true,fingerprint:await fingerprint()};};
 async function prepare(r){
  if(!location.pathname.toLowerCase().includes('appointmentboxcontainer'))throw Error('请先通过学校SSO正常登录');
  await wait(()=>document.querySelector('[date][time]'));
  await new Promise(resolve=>setTimeout(resolve,800));
  const begin=Date.parse(r.start),end=Date.parse(r.end);let nodes=Array.from(document.querySelectorAll('[date][time]'));
  for(let i=0;i<2&&!nodes.some(e=>e.getAttribute('date')===r.start.slice(0,10));i++){const old=nodes[0].getAttribute('date'),button=document.querySelector('#chooseTime '+(r.start.slice(0,10)>old?'.next-btn':'.pre-btn'));if(!button)break;button.click();await wait(()=>document.querySelector('[date][time]')?.getAttribute('date')!==old);nodes=Array.from(document.querySelectorAll('[date][time]'));}
  const lead=Number(text().match(/至少提前\s*(\d+)\s*分钟/)?.[1]||5);if(begin<Date.now()+lead*60000)throw Error('不满足学校要求的预约提前量');
  const slotStart=e=>Date.parse(e.getAttribute('date')+'T'+e.getAttribute('time')+':00+08:00');
  const wanted=nodes.filter(e=>slotStart(e)>=begin&&slotStart(e)<end).sort((a,b)=>slotStart(a)-slotStart(b));
  let cursor=begin;for(const e of wanted){const b=Date.parse(e.getAttribute('date')+'T'+e.getAttribute('time')+':00+08:00'),f=Date.parse(e.getAttribute('enddate')+'T'+e.getAttribute('endtime')+':00+08:00');if(b!==cursor||f>end)throw Error('时段不符合此设备的预约粒度');if(!e.classList.contains('canselect'))return {ok:false,code:'busy',error:'该时段已有占用或不可预约'};cursor=f;}
  if(cursor!==end)throw Error('日历未完整覆盖请求时段');
  const wantedIds=wanted.map(e=>e.id);
  for(const id of wantedIds){const e=document.getElementById(id);if(!e)throw Error('日历元素已变化');if(!e.classList.contains('select')){for(const type of ['pointerdown','mousedown','pointerup','mouseup'])e.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window,button:0,buttons:type.endsWith('down')?1:0}));e.click();await wait(()=>document.getElementById(id)?.classList.contains('select'),5000);}}
  const selected=Array.from(document.querySelectorAll('[date][time]')).filter(e=>e.classList.contains('select'));if(selected.length!==wantedIds.length||selected.some(e=>!wantedIds.includes(e.id)))throw Error('实际选择的时间格与任务不一致，已停止（选中'+selected.length+'，目标'+wantedIds.length+'）');
  const next=document.querySelector('#nextStep');if(!visible(next))throw Error('缺少选择时间的下一步');next.click();
  await wait(()=>visible(document.querySelector('#ExperimentationContent')));
  set('#ExperimentationContent',r.content);set('#SampleCount',r.sampleCount);
  const next2=document.querySelector('#nextStep2');if(!visible(next2))throw Error('缺少信息页的下一步');next2.click();
  await wait(()=>visible(document.querySelector('#submitBooking')));
  const t=text();const a=t.indexOf('预约时间及费用'),b=t.indexOf('设备使用说明',a);const c=t.indexOf('我已仔细阅读并同意以上条款');
  if(a<0||b<a||c<b)throw Error('预约确认结构发生变化，停止提交');
  const result=await validate(r);return {...result,feeText:t.slice(a,b).slice(0,2500),terms:t.slice(b,c).slice(0,22000)};
 }
 async function submit(r,authorized){if(!authorized)throw Error('缺少本次条款确认');const current=await validate(r);if(current.fingerprint!==r.fingerprint)throw Error('确认页已变化，请重新核对');const cb=document.querySelector('[name="hasReadTheNotice"]');if(!cb)throw Error('条款控件不存在');if(!cb.checked){const label=cb.nextElementSibling;if(!label)throw Error('条款控件结构改变');label.click();}if(!cb.checked)throw Error('本次条款确认未成功');document.querySelector('#submitBooking').click();await new Promise(r=>setTimeout(r,3000));return {ok:true};}
 async function verify(r){let bookingId,status;const aliases={'7959ecba-91ff-4575-b1d1-e3d4cd8d3c9a':'单臂旋转型脑立体定位系统1号（B2）','bac39ce5-6ccc-4946-b981-d8cf84e4b1c0':'双臂旋转型脑立体定位系统2号（B2）'};const normalize=s=>s.replace(/\s/g,'');
 await wait(()=>{for(const row of document.querySelectorAll('tr[data-index]')){const field=n=>row.querySelector('[data-field="'+n+'"]')?.textContent?.trim()||'';const name=field('EquipmentName');const matches=r.id==='96ec217c-86c6-457c-8909-65c14a1e374a'?/LSM\s*980.*-2/.test(name):normalize(name).includes(normalize(aliases[r.id]||r.name.split('（')[0]));
 if(matches&&field('BeginTimeStr')===stamp(r.start)&&field('EndTimeStr')===stamp(r.end)&&! /取消|作废|失败/.test(field('StatusStrNoHtml'))){const id=field('AppointmentCode').match(/^\d{4}-\d{2}-\d{2}-\d+$/);if(id){bookingId=id[0];status=/无需审核|已通过|审核通过/.test(field('AuditingStatusStrNoHtml'))?'verified':'pending_review';return true;}}}return false;},20000);return {ok:true,bookingId,status};}
 chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(!['prepare','validate','submit','verify'].includes(m.type))return;const run=m.type==='prepare'?()=>prepare(m.resource):m.type==='validate'?()=>validate(m.resource):m.type==='submit'?()=>submit(m.resource,m.authorized):()=>verify(m.resource);run().then(reply).catch(e=>reply({ok:false,code:'blocked',error:e.message}));return true;});
})();
