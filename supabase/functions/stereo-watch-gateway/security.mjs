export const SITE_ORIGIN='https://stereo-watch-hkust-gz.yuxingluo.chatgpt.site';
export const WEB_ORIGIN='https://lavanderloic-byte.github.io';
export async function keyMatches(key,expected){
 if(!key||key.length<32||key.length>256||!expected||!/^[a-f0-9]{64}$/.test(expected))return false;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
 const actual=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 let diff=0;for(let i=0;i<64;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
export function allowedOrigin(origin){return !origin||origin===WEB_ORIGIN||/^http:\/\/127\.0\.0\.1:(5173|5174)$/.test(origin);}
export function targetFor(action,method,cursor){
 if(action==='state'&&method==='GET')return '/api/state';
 if(action==='rule'&&method==='POST')return '/api/rule';
 if(action==='notify-test'&&method==='POST')return '/api/notify-test';
 if(action==='refresh'&&method==='POST'&&/^\d{1,3}$/.test(cursor||'0')&&Number(cursor||0)<=100)return '/api/refresh?cursor='+Number(cursor||0);
 return null;
}
