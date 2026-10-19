import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {keyMatches,allowedOrigin,targetFor} from '../supabase/functions/stereo-watch-gateway/security.mjs';
test('dedicated access key accepts only the matching secret',async()=>{const key=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(key).digest('hex');assert.equal(await keyMatches(key,hash),true);assert.equal(await keyMatches(key+'x',hash),false);assert.equal(await keyMatches('',hash),false);assert.equal(await keyMatches(key,null),false);});
test('gateway restricts origins and routes',()=>{assert(allowedOrigin('https://lavanderloic-byte.github.io'));assert(!allowedOrigin('https://unrelated.example'));assert(!allowedOrigin('https://lavanderloic-byte.github.io.evil.example'));assert.equal(targetFor('state','GET',null),'/api/state');assert.equal(targetFor('refresh','POST','4'),'/api/refresh?cursor=4');assert.equal(targetFor('refresh','POST','-1'),null);assert.equal(targetFor('refresh','POST','4&action=rule'),null);assert.equal(targetFor('rule','GET',null),null);assert.equal(targetFor('../private','GET',null),null);});
