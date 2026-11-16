import {makeBookingPlan} from './booking-plan.mjs';
import {EQUIPMENT} from './assistant.mjs';
import {parseCalendar} from './core.mjs';
const uuid=/^[a-f0-9-]{36}$/;
export async function booking(req:Request,action:string){
 let secrets:Record<string,string>={};try{secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');}catch{}
 const key=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',Prefer:'return=representation'};if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 const rest=async(path:string,method='GET',body?:unknown)=>{
  const r=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('预约任务保存或读取失败');const t=await r.text();return t?JSON.parse(t):null;
 };
 const text=await req.text();if(text.length>64000)throw Error('请求过长');const b=text?JSON.parse(text):{};
 if(action==='booking-status'){
  const workers=await rest('stereo_booking_workers?select=seen_at&order=seen_at.desc&limit=1');
  return {online:!!workers[0]&&Date.now()-Date.parse(workers[0].seen_at)<120000,jobs:await rest('stereo_booking_jobs?order=created_at.desc&limit=15')};
 }
 if(action==='availability'){
  const p=makeBookingPlan(b.plan),ids=[...new Set(p.groups.flatMap((g:any)=>g.candidates.map((m:any)=>m.id)))];
  return {machines:await Promise.all(ids.map(async(id:any)=>{try{
   const weeks=await Promise.all([0,1].map(async w=>{const r=await fetch('https://instrumentsharelab.hkust-gz.edu.cn/Equipment/AppointmentTimesContainer?IsHome=true&EquipmentId='+id+'&equipmentTimeAppointmemtMode=0&WeekIndex='+w,{signal:AbortSignal.timeout(15000)});if(!r.ok||r.url.toLowerCase().includes('login'))throw Error();return parseCalendar(await r.text());}));
   return {id,updated:Date.now(),slots:weeks.flat()};
  }catch{return {id,updated:0,error:'学校日历未能核实',slots:[]};}}))};
 }
 if(action==='booking-create'){
  if(!uuid.test(b.requestId))throw Error('请求编号无效');const plan=makeBookingPlan(b.plan);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(plan)));const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const existing=await rest('stereo_booking_jobs?plan_hash=eq.'+hash);if(existing.length)return existing[0];
  const rows=await rest('stereo_booking_jobs','POST',{request_id:b.requestId,plan_hash:hash,plan});return rows[0];
 }
 if(action==='booking-authorize'){
  if(!uuid.test(b.id))throw Error('任务编号无效');
  const rows=await rest('stereo_booking_jobs?id=eq.'+b.id+'&status=eq.awaiting_confirmation&updated_at=eq.'+encodeURIComponent(b.revision),'PATCH',{status:'authorized',updated_at:new Date().toISOString()});
  if(!rows.length)throw Error('任务状态已变化，请刷新后确认');return rows[0];
 }
 if(action==='booking-retry'){
  if(!uuid.test(b.id))throw Error('任务编号无效');
  const job=(await rest('stereo_booking_jobs?id=eq.'+b.id))[0];if(!job||job.status!=='blocked'||job.results?.length)throw Error('只允许重试尚未提交过的阻塞任务');
  makeBookingPlan(job.plan);
  return (await rest('stereo_booking_jobs?id=eq.'+b.id+'&status=eq.blocked','PATCH',{status:'queued',prepared:null,error:null,worker_id:null,updated_at:new Date().toISOString()}))[0];
 }
 if(action==='worker-claim'){
  if(!uuid.test(b.worker))throw Error('执行器编号无效');
  await rest('stereo_booking_workers?on_conflict=id','POST',{id:b.worker,seen_at:new Date().toISOString()}).catch(async()=>{await rest('stereo_booking_workers?id=eq.'+b.worker,'PATCH',{seen_at:new Date().toISOString()});});
  return {job:(await rest('rpc/stereo_booking_claim','POST',{worker:b.worker}))[0]||null};
 }
 if(action==='worker-update'){
  if(!uuid.test(b.worker)||!uuid.test(b.id))throw Error('执行器或任务编号无效');
  const current=(await rest('stereo_booking_jobs?id=eq.'+b.id+'&worker_id=eq.'+b.worker))[0];if(!current)throw Error('任务不属于当前执行器');
  const allowed:any={preparing:['awaiting_confirmation','blocked','uncertain'],submitting:['completed','partial','uncertain','blocked'],awaiting_confirmation:['uncertain']};
  if(!allowed[current.status]?.includes(b.status))throw Error('不允许的状态变化');
  if(b.status==='awaiting_confirmation'&&(!Array.isArray(b.prepared)||b.prepared.length!==current.plan.groups.length))throw Error('设备准备未完成');
  if(b.status==='completed'&&(!Array.isArray(b.results)||b.results.length!==current.plan.groups.length||b.results.some((x:any)=>x.status!=='verified'||!/^\d{4}-\d{2}-\d{2}-\d+$/.test(x.bookingId))))throw Error('缺少可回查的预约编号');
  const rows=await rest('stereo_booking_jobs?id=eq.'+b.id+'&status=eq.'+current.status,'PATCH',{status:b.status,prepared:b.prepared??current.prepared,results:b.results??current.results,error:String(b.error||'').slice(0,1000),updated_at:new Date().toISOString()});
  if(!rows.length)throw Error('任务状态已变化');return rows[0];
 }
 throw Error('不支持的预约操作');
}
