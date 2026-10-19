const ENDPOINT='https://mmuqrizmpfqgyajgcfwa.supabase.co/functions/v1/stereo-watch-gateway';
const STORAGE_KEY='stereo-watch-dashboard-access';
let transient='';
let linkKey='';
// Fragments are never sent to GitHub. Remove them before initiating API requests.
const params=new URLSearchParams(location.hash.slice(1));
if(params.has('access')){linkKey=params.get('access')||'';history.replaceState(null,'',location.pathname+location.search);}
export const initialLinkKey=()=>linkKey;
export function getAccessKey(){try{return transient||sessionStorage.getItem(STORAGE_KEY)||localStorage.getItem(STORAGE_KEY)||'';}catch{return transient;}}
export function setAccessKey(key:string,remember:boolean){transient=key.trim();try{localStorage.removeItem(STORAGE_KEY);sessionStorage.removeItem(STORAGE_KEY);(remember?localStorage:sessionStorage).setItem(STORAGE_KEY,transient);}catch{/* memory-only access remains usable */}}
export function clearAccess(){transient='';try{localStorage.removeItem(STORAGE_KEY);sessionStorage.removeItem(STORAGE_KEY);}catch{/* no persisted key */}}
export function api(path:string,options:RequestInit={}){
 const name=path.split('?')[0].replace(/^\//,'');const query=new URLSearchParams(path.split('?')[1]||'');query.set('action',name);query.set('forceFunctionRegion','ap-northeast-2');
 const headers=new Headers(options.headers);headers.set('x-stereo-key',getAccessKey());
 return fetch(ENDPOINT+'?'+query,{...options,headers,cache:'no-store',referrerPolicy:'no-referrer'});
}
