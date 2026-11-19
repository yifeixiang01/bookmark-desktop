const { chromium } = require('C:/Users/yifeixiang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const state={version:1,activePartitionId:'home',wallpaper:'dusk-ridge',searchEngine:'baidu',locked:false,iconSize:'m',partitions:[{id:'home',name:'主页',items:[{id:'b',kind:'bookmark',bookmark:{id:'bm',name:'示例网站',url:'https://example.com'}},{id:'f',kind:'group',group:{id:'folder',name:'收藏夹',bookmarks:[{id:'nested',name:'文件夹书签',url:'https://nested.example.com'}]}},{id:'card',kind:'app',app:{type:'note',text:'卡片内容',color:'cream',createdAt:0}}]},{id:'empty',name:'空空间',items:[]}]};
 for (const snapshot of [state,null]) {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const writes=[]; const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/trpc/**',async route=>{const names=new URL(route.request().url()).pathname.split('/').pop().split(',');writes.push(...names.filter(n=>n==='state.save'));await route.fulfill({contentType:'application/json',body:JSON.stringify(names.map(name=>({result:{data:{json:name==='auth.me'?{id:1,name:'测试',email:'test@example.com'}:name==='state.snapshot'?{state:snapshot,revision:0}:{revision:1}}}})))});});
 await page.goto('http://127.0.0.1:3000/mobile');
 await page.getByRole('navigation',{name:'书签空间'}).waitFor();
 const assertReadOnly=async()=>assert.equal(await page.getByRole('button',{name:/新增|新建|添加收藏|添加书签|添加到文件夹|编辑|修改|删除|重命名|整理|移动/}).count(),0);
 await assertReadOnly();
 if(snapshot){
 await page.getByRole('button',{name:/打开文件夹收藏夹/}).click();
 await page.locator('a[href="https://nested.example.com"]').waitFor();await assertReadOnly();
 await page.getByRole('button',{name:'关闭面板'}).click();
 await page.getByRole('searchbox',{name:'搜索书签'}).fill('文件夹');
 await page.locator('a[href="https://nested.example.com"]').waitFor();
 await page.getByRole('button',{name:'空空间',exact:true}).click();
 await page.getByRole('heading',{name:'这个空间还没有书签'}).waitFor();await assertReadOnly();
 await page.getByRole('button',{name:'主页',exact:true}).click();
 assert.equal(await page.getByText('卡片内容',{exact:true}).count(),0);
 }
 await page.getByRole('button',{name:'账号与应用'}).click();
 await page.getByText('只读浏览',{exact:true}).waitFor();await assertReadOnly();
 await page.getByRole('button',{name:'关闭面板'}).click();
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForTimeout(1600);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 await page.close();
 }
 console.log('PASS: mobile/folder/account/empty states have no mutation controls, nested bookmark search works, space selection is local, cards hidden, zero state.save requests including uninitialized cloud and focus refresh.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
