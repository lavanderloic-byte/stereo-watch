import test from 'node:test';import assert from 'node:assert/strict';
import {makeBookingPlan} from './booking-plan.mjs';
import {keyMatches} from '../supabase/functions/stereo-watch-gateway/security.mjs';
import {createHash} from 'node:crypto';
const now=Date.parse('2026-11-16T09:00:00+08:00');
test('two B2 instruments include fridge from one hour before to one hour after',()=>{const p=makeBookingPlan({experiment:'virus',date:'2026-11-17',start:'13:00',minutes:180,count:2},now);assert.equal(p.sampleCount,1);assert.equal(p.groups.length,3);assert.equal(p.groups[2].start,'2026-11-17T12:00+08:00');assert.equal(p.groups[2].end,'2026-11-17T17:00+08:00');assert.equal(p.groups[0].start,'2026-11-17T13:00+08:00');});
test('harvest resources are concurrent; imaging alternatives preserve order',()=>{let p=makeBookingPlan({experiment:'harvest',date:'2026-11-17',start:'13:00',minutes:120},now);assert.equal(p.groups.length,2);assert.equal(p.groups[0].end,p.groups[1].end);p=makeBookingPlan({experiment:'imaging',date:'2026-11-17',start:'13:00',minutes:120},now);assert.match(p.groups[0].candidates[0].name,/Leica/);assert.match(p.groups[0].candidates[1].name,/LSM/);});
test('server rejects expired, unsupported or invalid plans',()=>{for(const x of [{date:'2026-02-30'},{date:'2026-99-99'},{start:'25:00'},{minutes:0},{experiment:'anything'},{date:'2026-11-15'}])assert.throws(()=>makeBookingPlan({experiment:'slice',date:'2026-11-17',start:'13:00',minutes:180,...x},now));});
test('memorable eight-character passwords still require matching hash',async()=>{const key='testpass',hash=createHash('sha256').update(key).digest('hex');assert.equal(await keyMatches(key,hash),true);assert.equal(await keyMatches('wrongkey',hash),false);assert.equal(await keyMatches('short',hash),false);});
