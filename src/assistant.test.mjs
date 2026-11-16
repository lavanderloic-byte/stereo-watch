import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRequest,missingFields,equipmentFor,availability,EQUIPMENT} from './assistant.mjs';
const now=Date.parse('2026-11-16T10:00:00+08:00');
test('Chinese experiment requests and follow-up retain explicit fields',()=>{
 let p=parseRequest('我下午要打病毒，约两台脑立体',{},now);
 assert.equal(p.experiment,'virus');assert.equal(p.count,2);assert.deepEqual(missingFields(p),['日期','开始时间','持续多久']);
 p=parseRequest('明天下午2点开始，大概3h',p,now);
 assert.equal(p.date,'2026-11-17');assert.equal(p.start,'14:00');assert.equal(p.minutes,180);
 assert.deepEqual(equipmentFor(p).map(m=>m.id),[EQUIPMENT.stereo1.id,EQUIPMENT.stereo2.id,EQUIPMENT.fridge.id]);
});
test('harvest pairs resources, imaging priority, spectrum overrides generic confocal',()=>{
 assert.equal(equipmentFor(parseRequest('取脑',{},now)).length,2);
 assert.deepEqual(equipmentFor(parseRequest('拍片',{},now)).map(m=>m.id),[EQUIPMENT.leica.id,EQUIPMENT.zeiss.id]);
 assert.equal(parseRequest('全光谱共聚焦拍片',{},now).experiment,'spectrum');
 assert.equal(equipmentFor(parseRequest('电老鼠',{},now))[0].id,EQUIPMENT.fear.id);
});
test('new experiment cannot inherit another experiment duration',()=>{
 const first=parseRequest('明天13.00切脑片3h',{},now);
 assert.equal(first.start,'13:00');assert.equal(first.minutes,180);
 assert.deepEqual(missingFields(parseRequest('我要取脑',first,now)),['日期','开始时间','持续多久']);
});
test('past time, invalid time, more than two devices and multiple experiments do not proceed',()=>{
 for(const text of ['2026-99-99 13:00切片3h','今天9点切片3小时','明天25:00切片3h','明天13点打病毒三台3小时','明天13点切片和取脑3小时','明天13点去A区打病毒3小时'])assert.ok(parseRequest(text,{},now).error,text);
});
test('availability requires current, contiguous, complete free data',()=>{
 const p={date:'2026-11-17',start:'13:00',minutes:60};
 const slots=[{start:'2026-11-17T13:00:00+08:00',end:'2026-11-17T13:30:00+08:00',status:'free'},{start:'2026-11-17T13:30:00+08:00',end:'2026-11-17T14:00:00+08:00',status:'free'}];
 assert.equal(availability({updated:now,slots},p,now),'free');
 assert.equal(availability({updated:now-13*60000,slots},p,now),'unknown');
 assert.equal(availability({updated:now,slots:[slots[0]]},p,now),'unknown');
 assert.equal(availability({updated:now,slots:[slots[0],{...slots[1],status:'booked'}]},p,now),'booked');
 assert.equal(availability(undefined,p,now),'unknown');
});
