const { chromium } = require('C:/Users/yifeixiang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 const page = await browser.newPage({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let saved;
 await page.route('**/api/trpc/**', async route => {
   const names = new URL(route.request().url()).pathname.split('/').pop().split(',');
   await route.fulfill({contentType:'application/json',body:JSON.stringify(names.map(name=>({result:{data:{json:name==='auth.me'?{id:1,name:'林',email:'mobile@example.com'}:name==='state.snapshot'?{state:saved??null,revision:0}:name==='state.save'?{revision:1}:null}}})))});
 });
 await page.goto('http://localhost:3000/mobile');
 await page.getByRole('heading',{name:'我的收藏'}).waitFor();
 await page.waitForTimeout(450); await page.screenshot({path:'.codex-artifacts/mobile-home-updated.png',fullPage:true});
 const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(overflow) throw new Error('390px home overflow');
 await page.getByRole('button',{name:/打开文件夹开发/}).click();
 await page.getByRole('dialog').waitFor();
 await page.waitForTimeout(450); await page.screenshot({path:'.codex-artifacts/mobile-folder-updated.png'});
 await page.getByRole('button',{name:'关闭面板'}).click();
 await page.getByRole('button',{name:'整理',exact:true}).click();
 await page.getByRole('button',{name:'删除百度',exact:true}).click();
 await page.getByRole('alertdialog').waitFor();
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索书签'}).count().then(async n=>{await page.getByRole('searchbox',{name:'搜索书签'}).fill('github')});
 await page.getByRole('link',{name:/GitHub/}).waitFor();
 await page.getByRole('button',{name:'清空搜索'}).click();
 await page.getByRole('button',{name:'添加收藏',exact:true}).last().click();
 await page.getByRole('button',{name:/添加书签.*保存网址/}).click();
 await page.getByRole('heading',{name:'添加书签',exact:true}).waitFor();
 await page.waitForTimeout(450); await page.screenshot({path:'.codex-artifacts/mobile-form-updated.png'});
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'新建空间',exact:true}).click();
 await page.getByPlaceholder('输入一个名字').fill('移动端新空间');
 await page.getByRole('button',{name:'确定',exact:true}).click();
 await page.getByRole('heading',{name:'移动端新空间',exact:true}).waitFor();
 await page.getByRole('heading',{name:'留一点空间，给新的灵感'}).waitFor();
 await page.setViewportSize({width:320,height:640});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('320px overflow');
 await page.waitForTimeout(450); await page.screenshot({path:'.codex-artifacts/mobile-empty-320.png'});
 console.log(JSON.stringify({errors,checks:['390px home','folder drawer','delete cancel','search','bookmark form','create space','empty state','320px overflow']}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


