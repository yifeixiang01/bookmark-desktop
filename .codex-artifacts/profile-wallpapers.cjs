const {chromium}=require('C:/Users/yifeixiang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}); const results=[];
for(const id of ['dusk-ridge','bookmark-islands','kite-meadow','koi-pond']){
 const page=await browser.newPage({viewport:{width:1440,height:900}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.costs=[];const raf=window.requestAnimationFrame;window.requestAnimationFrame=callback=>raf.call(window,t=>{const start=performance.now();callback(t);window.costs.push(performance.now()-start)});});
 const state={version:1,activePartitionId:'home',wallpaper:id,searchEngine:'baidu',locked:false,iconSize:'m',partitions:[{id:'home',name:'主页',items:Array.from({length:18},(_,i)=>({id:'item'+i,kind:'bookmark',pos:{x:i%6,y:Math.floor(i/6)},bookmark:{id:'b'+i,name:'示例'+i,url:'https://example.com/'+i}}))}]};
 await page.route('**/api/trpc/**',async route=>{const names=new URL(route.request().url()).pathname.split('/').pop().split(',');await route.fulfill({contentType:'application/json',body:JSON.stringify(names.map(name=>({result:{data:{json:name==='auth.me'?{id:987,name:'预览',email:'preview@example.com'}:name==='state.snapshot'?{state,revision:0}:{revision:1}}}})))});});
 await page.goto('http://127.0.0.1:3000/');await page.waitForTimeout(3500);await page.evaluate(()=>window.costs=[]);
 if(id==='koi-pond'){await page.mouse.click(810,600);await page.mouse.click(930,610)}
 await page.waitForTimeout(4000); const stats=await page.evaluate(()=>{const c=window.costs.filter(x=>x>.05).sort((a,b)=>a-b);return {callbacks:c.length,meanMs:c.reduce((a,b)=>a+b,0)/c.length,p95Ms:c[Math.floor(c.length*.95)],maxMs:c.at(-1),totalMs:c.reduce((a,b)=>a+b,0)}});results.push({id,...stats,errors}); await page.close();
}await browser.close();fs.writeFileSync(process.argv[2]||'.codex-artifacts/wallpaper-performance.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exit(1)});
