import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,ExternalLink} from 'lucide-react';
import {EXPERIMENTS,parseRequest,missingFields,equipmentFor,availability} from './assistant.mjs';
type Entry={role:string,text:string,plan?:any};
const examples=['今天13.00开始切脑片，大概3h','明天下午2点打病毒，约两台脑立体，3小时','明天10点取脑，2小时','后天9点拍片，3小时','明天14点全光谱，2小时','明天9点电老鼠，1小时'];
export default function Assistant({machines=[]}:{machines:any[]}){
 const [input,setInput]=useState(''),[plan,setPlan]=useState<any>({}),[entries,setEntries]=useState<Entry[]>([{role:'assistant',text:'告诉我做什么实验、哪天、几点开始、需要多久。我会按你的设备偏好整理安排，并核对已接入的日历。你可以分几条消息补充。'}]);
 const end=useRef<HTMLDivElement>(null);
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[entries]);
 function send(text:string){if(!text.trim())return;const p:any=parseRequest(text,plan);setInput('');
  if(/^(新安排|重新开始|清空)$/.test(text.trim())){setPlan({});setEntries([{role:'assistant',text:'开始一项新安排。请告诉我实验、日期、开始时间和时长。'}]);return;}
  setPlan(p);const missing=missingFields(p);let reply=p.error||(!p.experiment?'我还没识别到实验。可以说切片、取脑、打病毒、电老鼠、拍片或全光谱。':missing.length?'还需要：'+missing.join('、')+'。例如：明天13:00开始，3小时。':`已整理：${EXPERIMENTS.find(e=>e.id===p.experiment)?.label}，${p.date} ${p.start}开始，${p.minutes/60}小时。`);
  if(!p.error&&!missing.length){reply+='\n下方是设备清单和日历参考。当前尚未接入自动提交，预约需在学校页面完成。';if(p.experiment==='virus')reply+='\nB2打病毒还需领用美洛昔康；冰箱领用时间请单独确认，不自动占满手术时段。';}
  setEntries(prev=>[...prev,{role:'user',text},{role:'assistant',text:reply,plan:!p.error&&!missing.length?{...p}:undefined}]);
 }
 return <div className="assistantGrid"><section className="panel chatPanel"><div className="chatTitle"><MessageCircle/><div><h2>实验预约助手</h2><p className="muted">按你的实验习惯整理仪器和时间</p></div><span className="chatMode">安排与日历参考</span></div>
 <div className="notice">自动预约尚未接通 · 本页不会提交或取消学校预约</div>
 <div className="chatLog" role="log" aria-label="预约对话" aria-live="polite">{entries.map((entry,i)=><article key={i} className={'chatEntry '+entry.role}><small>{entry.role==='user'?'你':'预约助手'}</small><p>{entry.text}</p>{entry.plan&&<div className="bookingCards">{equipmentFor(entry.plan).map((m:any,index:number)=>{const accessory=m.name.includes('美洛昔康'),status=accessory?'unknown':availability(machines.find(x=>x.id===m.id),entry.plan),imaging=entry.plan.experiment==='imaging';return <div className="bookingCard" key={m.id}><b>{m.name}</b><span>{accessory?'附带领用 · 起止时间待补充':imaging?(index===0?'首选设备':'首选无空位时的备选'):'所需设备'}</span><strong className={status==='free'?'fresh':'muted'}>{status==='free'?'日历参考空闲 · 未预约':status==='booked'?'该时段存在占用 · 未预约':'空闲未核实 · 未预约'}</strong><a target="_blank" rel="noopener noreferrer" href={m.url}>打开学校预约页面 <ExternalLink size={13}/></a></div>;})}</div>}</article>)}<div ref={end}/></div>
 <form className="chatComposer" onSubmit={e=>{e.preventDefault();send(input);}}><label className="srOnly" htmlFor="chat-message">实验安排消息</label><textarea id="chat-message" value={input} maxLength={1000} rows={2} placeholder="例如：明天下午2点打病毒，两台，3小时" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send(input);}}}/><button className="primary" disabled={!input.trim()} type="submit"><Send size={17}/>发送</button></form><button className="textButton" onClick={()=>send('新安排')}>开始新安排</button><div className="chatExamples">{examples.map(x=><button key={x} onClick={()=>setInput(x)}>{x}</button>)}</div>
 </section><aside className="panel assistantRules"><p className="eyebrow">你的设备偏好</p><h2>实验 → 仪器</h2>{EXPERIMENTS.map(e=><article key={e.id}><b>{e.label}</b><p>{e.hint}</p></article>)}<p className="muted note">时间按北京时间。缺少信息会继续询问。B2无法满足时，换地点需你确认。尚未接入日历的仪器显示“空闲未核实”。对话只在当前页面内保留。</p></aside></div>;
}
