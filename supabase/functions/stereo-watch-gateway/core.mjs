export const ORIGIN = 'https://instrumentsharelab.hkust-gz.edu.cn';
export const DEFAULT_RULE = { mode:'rolling', days:14, startDate:'', endDate:'', startTime:'07:00', endTime:'23:30', minMinutes:120, machineIds:[], enabled:false, notifyLost:false };
export function decode(s='') { return s.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
export function attributes(tag) { const o={}; for(const m of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) o[m[1].toLowerCase()]=decode(m[2]??m[3]); return o; }
export function parseMachines(html) {
 const map=new Map();
 for(const m of html.matchAll(/doAppointment\('([a-f\d-]{36})','([^']+)'/gi)) {
  const name=decode(m[2]); const floor=(name.match(/[1-9]F/)||[''])[0];const location=(name.match(/138[ABCDE]|[ABF][12]/)||['未标注房间'])[0];const room=[floor,location].filter(Boolean).join(' · ');
  map.set(m[1],{id:m[1],name,shortName:name.split(/691\d+|710\d+|Dual-Arm/)[0].trim(),room,url:ORIGIN+'/console/appointment/AppointmentBoxContainer?id='+m[1]});
 }
 if(!map.size) throw Error('设备列表结构变化或返回登录页');
 return [...map.values()];
}
export function parseCalendar(html) {
 const slots=[]; const seen=new Set();
 for(const m of html.matchAll(/<(?:div|td)\b[^>]*\bdate="\d{4}-\d{2}-\d{2}"[^>]*>/gi)) {
  const a=attributes(m[0]); if(!a.date||!a.time||!a.enddate||!a.endtime) continue;
  const state=(a.class||'').split(/\s+/); const status=state.includes('canselect')?'free':state.includes('elsechoose')||state.includes('selfchoose')?'booked':state.includes('cantbook')?'unavailable':'unknown';
  const start=a.date+'T'+a.time.slice(0,5)+':00+08:00',end=a.enddate+'T'+a.endtime.slice(0,5)+':00+08:00';
  if(!Number.isFinite(Date.parse(start))||Date.parse(end)<=Date.parse(start)||seen.has(start)) throw Error('日历包含异常或重复时间段');
  if(status==='unknown') throw Error('日历出现未知状态，已停止空位判断');
  seen.add(start); slots.push({start,end,status});
 }
 if(slots.length<7) throw Error('未找到有效日历，可能登录要求或页面结构已改变');
 const days=new Set(slots.map(s=>s.start.slice(0,10))); if(days.size!==7) throw Error('日历不完整，未覆盖完整一周');
 // A partial response must never make booked slots appear free.
 const dayCounts=[...days].map(d=>slots.filter(s=>s.start.startsWith(d)).length);
 if(new Set(dayCounts).size!==1) throw Error('日历各天的时段数量不一致');
 return slots.sort((a,b)=>a.start.localeCompare(b.start));
}
export const hkDate=(now=Date.now())=>new Date(now+8*3600000).toISOString().slice(0,10);
export const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00+08:00')+n*86400000+8*3600000).toISOString().slice(0,10);
export function validateRule(input) {
 const r={...DEFAULT_RULE,...input};
 if(!['rolling','fixed'].includes(r.mode)||!Number.isInteger(+r.days)||r.days<1||r.days>14) throw Error('监控范围应为未来 1–14 天');
 if(!/^\d{2}:\d{2}$/.test(r.startTime)||!/^\d{2}:\d{2}$/.test(r.endTime)||r.startTime>='24:00'||r.endTime>'24:00'||r.startTime>=r.endTime||!/^\d\d:(00|30)$/.test(r.startTime)||!/^\d\d:(00|30)$/.test(r.endTime)) throw Error('请选择同一天内有效的半小时时段');
 if(!Number.isInteger(+r.minMinutes)||r.minMinutes<30||r.minMinutes>1440||r.minMinutes%30) throw Error('连续时长应为 30 分钟的整数倍');
 if(!Array.isArray(r.machineIds)||r.machineIds.length>100||r.machineIds.some(id=>!/^[a-f0-9-]{36}$/.test(id))) throw Error('设备选择无效');
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 if(r.mode==='fixed'&&(!validDate(r.startDate)||!validDate(r.endDate)||r.endDate<r.startDate)) throw Error('请选择有效的起止日期');
 return {...r,days:+r.days,minMinutes:+r.minMinutes,enabled:!!r.enabled,notifyLost:!!r.notifyLost};
}
export function windows(slots,rule,now=Date.now()) {
 const today=hkDate(now),lo=rule.mode==='fixed'?rule.startDate:today,hi=rule.mode==='fixed'?rule.endDate:addDays(today,rule.days-1);
 const good=slots.filter(s=>s.status==='free'&&Date.parse(s.start)>=now+5*60000&&s.start.slice(0,10)>=lo&&s.start.slice(0,10)<=hi&&s.start.slice(11,16)>=rule.startTime&&s.end.slice(0,10)===s.start.slice(0,10)&&s.end.slice(11,16)<=rule.endTime).sort((a,b)=>a.start.localeCompare(b.start));
 const runs=[]; for(const s of good) {const last=runs.at(-1); if(last&&last.end===s.start)last.end=s.end;else runs.push({start:s.start,end:s.end});}
 return runs.filter(r=>(Date.parse(r.end)-Date.parse(r.start))/60000>=rule.minMinutes);
}
export function transitions(before,after,now=Date.now()) {
 const old=new Map(before.map(s=>[s.start,s])); const out=[];
 for(const s of after) {const b=old.get(s.start);if(!b||Date.parse(s.start)<now+5*60000)continue;
  if(b.status==='booked'&&s.status==='free')out.push({...s,type:'released'});
  if(b.status==='free'&&s.status==='booked')out.push({...s,type:'booked'});
 } return out;
}
export function groupChanges(changes) {const out=[];for(const s of [...changes].sort((a,b)=>a.start.localeCompare(b.start))){const last=out.at(-1);if(last&&last.type===s.type&&last.end===s.start)last.end=s.end;else out.push({...s});}return out;}
export function matchingChanges(changes,allSlots,rule,now=Date.now()) {
 const runs=windows(allSlots,rule,now);
 return runs.filter(r=>changes.some(c=>c.type==='released'&&c.start<r.end&&c.end>r.start));
}
