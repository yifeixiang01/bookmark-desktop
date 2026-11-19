const {chromium}=require('C:/Users/yifeixiang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge'});try{
const p=await b.newPage({viewport:{width:1440,height:900}});
let state={version:1,activePartitionId:'home',wallpaper:'dusk-ridge',searchEngine:'baidu',locked:false,iconSize:'m',partitions:[{id:'home',name:'测试',items:[]}]};
await p.route('**/api/trpc/**',async r=>{const names=new URL(r.request().url()).pathname.split('/').pop().split(',');await r.fulfill({json:names.map(name=>({result:{data:{json:name==='auth.me'?{id:987,name:'测试'}:name==='state.snapshot'?{state,revision:0}:{revision:1}}}}))});});
await p.goto(process.argv[2]||'http://127.0.0.1:3000');
await p.getByRole('button',{name:'设置',exact:true}).click({timeout:8000});await p.getByRole('button',{name:'字体外观',exact:true}).click();
let measure=()=>p.evaluate(()=>{const el=document.querySelector('[role=dialog]');const preview=[...el.querySelectorAll('p')].find(e=>e.textContent.includes('字号实时预览'));return [getComputedStyle(preview).fontSize,getComputedStyle(el).width,document.documentElement.style.cssText,getComputedStyle(document.documentElement).fontSize]});
const before=await measure();await p.locator('#app-font-scale').press('End');const after=await measure();await p.getByRole('button',{name:'恢复默认字号'}).click();const reset=await measure();console.log({before,after,reset});require('node:assert/strict').ok(parseFloat(after[0])>parseFloat(reset[0]) && after[1]===reset[1]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
