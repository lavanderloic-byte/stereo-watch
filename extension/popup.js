const status=document.querySelector('#state');
document.querySelector('#connect').onclick=async()=>{const key=document.querySelector('#key').value.trim();if(key.length<8){status.textContent='请输入至少8位访问码';return;}await chrome.runtime.sendMessage({type:'connect',key,remember:document.querySelector('#remember').checked});status.textContent='已连接，正在检查任务。'};
document.querySelector('#stop').onclick=async()=>{await chrome.runtime.sendMessage({type:'stop'});status.textContent='已暂停。已提交的预约不会取消。'};
chrome.storage.local.get(['lastStatus']).then(x=>{status.textContent=x.lastStatus||'尚未连接';});
