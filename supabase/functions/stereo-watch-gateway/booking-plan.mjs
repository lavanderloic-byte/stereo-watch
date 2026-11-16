import {EQUIPMENT as E} from './assistant.mjs';
export function makeBookingPlan(input,now=Date.now()){
 const {experiment,date,start,minutes}=input;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!Number.isInteger(minutes)||minutes<15||minutes>1440)throw Error('请补充有效的日期、开始时间和时长');
 const begin=Date.parse(date+'T'+start+':00+08:00'),finish=begin+minutes*60000;
 if(!Number.isFinite(begin)||new Date(begin+8*3600000).toISOString().slice(0,10)!==date||begin<now+5*60000||begin>now+8*86400000)throw Error('预约须为有效日期、至少提前5分钟，并在未来8天内');
 const iso=t=>new Date(t+8*3600000).toISOString().slice(0,16)+'+08:00';
 const group=(keys,b=begin,e=finish)=>({candidates:keys.map(k=>E[k]),start:iso(b),end:iso(e)});
 const count=input.count??1;let groups;
 if(experiment==='fridge')groups=[group(['fridge'])];
 else if(experiment==='slice')groups=[group(['slice'])];
 else if(experiment==='harvest')groups=[group(['anesthesia']),group(['table'])];
 else if(experiment==='fear')groups=[group(['fear'])];
 else if(experiment==='spectrum')groups=[group(['spectrum'])];
 else if(experiment==='imaging')groups=[group(['leica','zeiss'])];
 else if(experiment==='virus'){
  if(![1,2].includes(count))throw Error('B2只支持1或2台');
  if(begin-3600000<now+5*60000)throw Error('冰箱需从手术前1小时开始，请留足预约提前量');
  groups=[...(count===2?[group(['stereo1']),group(['stereo2'])]:[group(['stereo1','stereo2'])]),group(['fridge'],begin-3600000,finish+3600000)];
 }else throw Error('不支持的实验');
 return {experiment,date,start,minutes,count,sampleCount:1,groups,content:{fridge:'预约助手真实预约流程测试（不代表已领用药品）',slice:'固定脑组织振动切片',harvest:'取脑/组织取材',fear:'条件恐惧行为实验',spectrum:'全光谱共聚焦成像',imaging:'共聚焦成像',virus:'病毒注射'}[experiment]};
}
