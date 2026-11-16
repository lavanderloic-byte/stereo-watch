import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {missingFields} from './assistant.mjs';
export default function BookingQueue({plan,onAvailability}:{plan:any,onAvailability:(m:any[])=>void}){
 const [state,setState]=useState<any>({online:false,jobs:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false);const sent=useRef('');
 async function call(action:string,body:any={}){const r=await api('/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'连接失败');return d;}
 async function refresh(){try{setState(await call('booking-status'));}catch(e){setError(e instanceof Error?e.message:String(e));}}
 useEffect(()=>{refresh();const t=setInterval(refresh,10000);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(plan.error||missingFields(plan).length)return;const signature=JSON.stringify(plan);if(sent.current===signature)return;sent.current=signature;setBusy(true);setError('');
  (async()=>{try{await call('booking-create',{plan,requestId:crypto.randomUUID()});await refresh();const a=await call('availability',{plan});onAvailability(a.machines);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}})();
 },[plan]);
 async function authorize(job:any){setBusy(true);try{await call('booking-authorize',{id:job.id,revision:job.updated_at});await refresh();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 const labels:any={queued:'等待本机执行器',preparing:'核实空闲并填写表单',awaiting_confirmation:'待本次条款确认',authorized:'已确认，等待提交',submitting:'正在提交并回查',completed:'预约完成，编号已回查',blocked:'需要处理',partial:'部分完成，请核对',uncertain:'提交结果待人工核实，请勿重复预约'};
 return <section className="queuePanel"><h3>预约任务</h3><p className={state.online?'fresh':'muted'}>{state.online?'● 本机执行器在线':'● 本机执行器离线：需在电脑Chrome安装并连接扩展'}</p><p className="muted note">样本数默认1。B2冰箱从手术前1小时到结束后1小时。每台设备的实际时间、费用和条款核实后，会在这里等待本次确认。</p>{busy&&<p role="status">正在处理…</p>}{error&&<p role="alert" className="bad">{error}</p>}
 {!state.jobs.length&&<p className="muted">发出完整实验安排后，自动创建核实任务。</p>}
 {state.jobs.map((job:any)=><article className="queueJob" key={job.id}><b>{job.plan.date} {job.plan.start} · {job.plan.minutes/60}小时</b><strong>{labels[job.status]||job.status}</strong>{job.error&&<p role="alert">{job.error}</p>}
 {job.prepared?.map((p:any)=><div className="queueResource" key={p.id}><b>{p.name}</b><p>{p.start.replace('T',' ').slice(0,16)} 至 {p.end.replace('T',' ').slice(0,16)}</p><pre>{p.feeText}</pre><details><summary>阅读学校本次使用条款</summary><pre>{p.terms}</pre></details></div>)}
 {job.status==='awaiting_confirmation'&&<><p className="note">点击即确认：已阅读并同意上列每台设备本次预约的学校条款，并提交这些具体时段的预约。</p><button className="primary" disabled={busy} onClick={()=>authorize(job)}>确认条款并提交本次{job.prepared?.length}台预约</button></>}
 {job.results?.map((r:any)=><p key={r.id}>{r.name}：{r.bookingId?'预约编号 '+r.bookingId:r.status}</p>)}
 </article>)}<button className="textButton" onClick={refresh}>刷新任务状态</button></section>;
}
