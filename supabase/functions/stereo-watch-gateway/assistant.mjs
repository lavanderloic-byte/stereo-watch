import {hkDate,addDays,ORIGIN} from './core.mjs';

const machine=(id,name)=>({id,name,url:ORIGIN+'/console/appointment/AppointmentBoxContainer?id='+id});
// Only public equipment identifiers and user-specified preferences belong here.
export const EQUIPMENT={
 slice:machine('a69d0060-3659-48eb-b1f1-48b85b98e6b9','振动切片机（固定样品）'),
 stereo1:machine('7959ecba-91ff-4575-b1d1-e3d4cd8d3c9a','B2脑立体1号'),
 stereo2:machine('bac39ce5-6ccc-4946-b981-d8cf84e4b1c0','B2脑立体2号'),
 anesthesia:machine('6891e908-efe6-4cc6-88a0-4af75abebbc0','台式小动物麻醉机（134B 解剖室）'),
 table:machine('c2ace149-d1c9-43ef-9c35-d7f677c9888a','手术解剖台004'),
 fear:machine('f8c3643b-95c4-4a96-a465-d888e99508c4','FreezeScan条件恐惧视频检测分析系统'),
 fridge:machine('20fdb41d-c27c-4796-83e9-bfc26ae1691a','冰箱-B区操作间B2（美洛昔康领用）'),
 leica:machine('235c92fd-8500-44d5-9a11-d66ed1660a25','Leica STELLARIS 5（无活细胞培养系统）'),
 zeiss:machine('96ec217c-86c6-457c-8909-65c14a1e374a','LSM 980 -2（无活细胞培养系统）'),
 spectrum:machine('8387e101-7d5b-4395-93e3-53e5643ce4de','全光谱高分辨率荧光寿命激光共聚焦显微镜')
};
export const EXPERIMENTS=[
 {id:'fridge',label:'B2冰箱领用',hint:'B区操作间B2美洛昔康领用',keys:['fridge'],pattern:/冰箱|美洛昔康领用/},
 {id:'slice',label:'切脑片',hint:'固定样品振动切片机',keys:['slice'],pattern:/切脑片|切片/},
 {id:'harvest',label:'杀鼠 / 取脑',hint:'麻醉机 + 手术解剖台004，同期预约',keys:['anesthesia','table'],pattern:/杀鼠|取脑|灌流|取材/},
 {id:'fear',label:'电老鼠',hint:'FreezeScan条件恐惧系统',keys:['fear'],pattern:/电老鼠|条件恐惧|freezescan/i},
 {id:'virus',label:'打病毒',hint:'优先B2脑立体；另需B2冰箱领用',keys:['stereo1','stereo2','fridge'],pattern:/打病毒|注射病毒|脑立体|脑立体定位/},
 {id:'spectrum',label:'全光谱',hint:'指定全光谱荧光寿命共聚焦',keys:['spectrum'],pattern:/全光谱|荧光寿命/},
 {id:'imaging',label:'拍片',hint:'优先Leica STELLARIS 5，无空位再选LSM 980 -2',keys:['leica','zeiss'],pattern:/拍片|拍照|共聚焦|stellaris|lsm\s*980/i}
];
const num=s=>({一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,半:0.5}[s]??Number(s));
const time=(h,m=0)=>String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
export function parseRequest(text,previous={},now=Date.now()){
 const normalized=text.normalize('NFKC').replace(/：/g,':');
 const hits=EXPERIMENTS.filter(e=>e.pattern.test(normalized));
 // Full-spectrum explicitly overrides the generic confocal keyword.
 const chosen=hits.some(e=>e.id==='spectrum')?hits.filter(e=>e.id!=='imaging'):hits;
 if(chosen.length>1)return {...previous,error:'这条消息包含多个实验，请每次安排一个实验。'};
 const fresh=chosen[0]&&chosen[0].id!==previous.experiment;
 const p={...(fresh?{}:previous),error:'',experiment:chosen[0]?.id||previous.experiment};
 const explicit=normalized.match(/(\d{4}-\d{2}-\d{2})/);
 if(explicit)p.date=explicit[1];
 else if(/大后天/.test(normalized))p.date=addDays(hkDate(now),3);
 else if(/后天/.test(normalized))p.date=addDays(hkDate(now),2);
 else if(/明天/.test(normalized))p.date=addDays(hkDate(now),1);
 else if(/今天|今日/.test(normalized))p.date=hkDate(now);
 let t=normalized.match(/(?<!\d)(\d{1,2})[:.](\d{2})(?!\d)/);
 if(!t)t=normalized.match(/(\d{1,2}|[一二两三四五六七八九十])\s*[点时](半|\d{1,2}分?)?/);
 if(t){let h=num(t[1]),m=t[2]==='半'?30:Number((t[2]||'0').replace('分',''));if(/下午|晚上/.test(normalized)&&h<12)h+=12;p.start=time(h,m);}
 const duration=normalized.match(/(\d+(?:\.\d+)?|[一二两三四五六七八九十半])\s*(小时|小時|个小时|h\b|分钟|min\b)/i);
 if(duration)p.minutes=num(duration[1])*(/分钟|min/i.test(duration[2])?1:60)+(/小时半/.test(normalized)?30:0);
 const count=normalized.match(/(\d+|[一二两三四五六七八九十])\s*台/);
 if(count)p.count=num(count[1]);
 if(p.experiment==='virus'&&!p.count)p.count=1;
 if(/(?:A|F|D|E)\s*区|其他地方|别的地方/i.test(normalized)&&p.experiment==='virus')p.error='当前保存的是优先B2的规则。其他地点需要先确认具体设备。';
 if(p.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date+'T00:00:00Z'))||new Date(p.date+'T00:00:00Z').toISOString().slice(0,10)!==p.date))p.error='日期无效，请使用例如2026-11-20的日期。';
 if(p.start&&(+p.start.slice(0,2)>23||+p.start.slice(3)>59))p.error='开始时间无效，请使用24小时制，例如13:00。';
 if(p.minutes&&(!Number.isFinite(p.minutes)||p.minutes<=0||p.minutes>1440))p.error='请填写一天以内的有效时长。';
 if(p.experiment==='virus'&&p.count>2)p.error='B2优先设备只有两台，更多设备需要先确认其他地点。';
 if(p.date&&p.start&&p.minutes){const start=Date.parse(p.date+'T'+p.start+':00+08:00');if(start<=now)p.error='开始时间已过去，请重新指定日期和时间。';if(Number(p.start.slice(0,2))*60+Number(p.start.slice(3))+p.minutes>=1440)p.error='请指定同一天内结束的时段。';}
 return p;
}
export function missingFields(p){return [!p.experiment&&'实验名称',!p.date&&'日期',!p.start&&'开始时间',!p.minutes&&'持续多久'].filter(Boolean);}
export function equipmentFor(p){if(p.experiment==='virus')return (p.count===2?['stereo1','stereo2','fridge']:['stereo1','fridge']).map(k=>EQUIPMENT[k]);return (EXPERIMENTS.find(e=>e.id===p.experiment)?.keys||[]).map(k=>EQUIPMENT[k]);}
export function availability(machine,p,now=Date.now()){
 if(!machine||machine.error||!machine.updated||now-machine.updated>=12*60000||machine.updated>now+60000)return 'unknown';
 const start=Date.parse(p.date+'T'+p.start+':00+08:00'),end=start+p.minutes*60000;
 if(!Number.isFinite(start)||!p.minutes)return 'unknown';
 const slots=(machine.slots||[]).filter(s=>Date.parse(s.end)>start&&Date.parse(s.start)<end).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
 let cursor=start;
 for(const s of slots){if(Date.parse(s.start)>cursor)return 'unknown';if(s.status==='booked')return 'booked';if(s.status!=='free')return 'unknown';cursor=Math.max(cursor,Date.parse(s.end));}
 return cursor>=end?'free':'unknown';
}
