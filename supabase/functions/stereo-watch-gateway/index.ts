import {SITE_ORIGIN,allowedOrigin,keyMatches,targetFor} from './security.mjs';
let cache:{at:number,value:{siteBearer:string,accessHash:string}}|null=null;
async function config(){
 if(cache&&Date.now()-cache.at<30000)return cache.value;
 const url=Deno.env.get('SUPABASE_URL')!;
 let secrets:Record<string,string>={};try{secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');}catch{/* legacy runtime */}
 const key=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw Error('Missing server configuration');
 const headers:Record<string,string>={'Content-Type':'application/json',apikey:key};if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 const response=await fetch(url+'/rest/v1/rpc/stereo_watch_gateway_config',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Configuration unavailable');const value=await response.json();
 if(!value?.siteBearer||!value?.accessHash)throw Error('Configuration incomplete');cache={at:Date.now(),value};return value;
}
// Requests use a dedicated dashboard key. Infrastructure keys never reach clients.
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');const cors:Record<string,string>={'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json; charset=utf-8'};
 if(origin&&allowedOrigin(origin)){cors['Access-Control-Allow-Origin']=origin;cors['Access-Control-Allow-Headers']='content-type,x-stereo-key';cors['Access-Control-Allow-Methods']='GET,POST,OPTIONS';}
 const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:cors});
 if(!allowedOrigin(origin))return json({error:'不允许此来源访问'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const key=req.headers.get('x-stereo-key')||'';if(key.length<32||key.length>256)return json({error:'请使用专属链接或输入访问码'},401);
 try{
  const cfg=await config();if(!await keyMatches(key,cfg.accessHash))return json({error:'访问码无效'},401);
  const url=new URL(req.url),path=targetFor(url.searchParams.get('action')||'state',req.method,url.searchParams.get('cursor'));
  if(!path)return json({error:'请求无效'},400);
  let body:string|undefined;if(req.method==='POST'){body=await req.text();if(body.length>16384)return json({error:'设置内容过长'},413);if(body)try{JSON.parse(body);}catch{return json({error:'设置格式无效'},400);}}
  const response=await fetch(SITE_ORIGIN+path,{method:req.method,headers:{'OAI-Sites-Authorization':'Bearer '+cfg.siteBearer,'Content-Type':'application/json'},body,redirect:'error',signal:AbortSignal.timeout(path.includes('refresh')?90000:30000)});
  if(!response.headers.get('Content-Type')?.includes('application/json'))return json({error:'云端接口暂时不可达，请稍后再试'},502);
  return new Response(await response.text(),{status:response.status,headers:cors});
 }catch{return json({error:'云端连接暂时失败，请稍后再试'},503);}
});
