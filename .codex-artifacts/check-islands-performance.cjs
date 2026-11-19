const { chromium } = require('C:/Users/yifeixiang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let state = { version: 1, activePartitionId: 'home', wallpaper: 'dusk-ridge', searchEngine: 'baidu', locked: false, iconSize: 'm',
    partitions: [
      { id: 'home', name: '我的群岛', items: [
        ...[['GitHub', 0, 0], ['设计灵感', 1, 0], ['阅读清单', 0, 1], ['音乐电台', 4, 2], ['今日发现', 5, 2], ['工具箱', 5, 4]].map(([name, x, y], i) => ({ id: 'item-' + i, kind: 'bookmark', pos: { x, y }, bookmark: { id: 'bm-' + i, name, url: 'https://example.com/' + i, icon: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="${['#283d54','#e9a36b','#8a9f78','#7b83bc','#56999d','#cb8e92'][i]}"/><text x="32" y="43" font-size="32" fill="white" text-anchor="middle">${['G','✦','R','♫','D','T'][i]}</text></svg>`) } })),
        { id: 'folder-item', kind: 'group', pos: { x: 3, y: 4 }, group: { id: 'folder', name: '探索与收藏', bookmarks: [{ id: 'nested', name: '收藏', url: 'https://example.com' }] } },
      ] },
      { id: 'empty', name: '无人之岛', items: [] },
    ] };
  await page.route('**/api/trpc/**', async route => {
    const names = new URL(route.request().url()).pathname.split('/').pop().split(',');
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(names.map(name => ({ result: { data: { json: name === 'auth.me' ? { id: 987, name: '预览', email: 'preview@example.com' } : name === 'state.snapshot' ? { state, revision: 0 } : { revision: 1 } } } }))) });
  });
  await page.goto('http://127.0.0.1:3000/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '壁纸背景', exact: true }).click();
  const builtIn = page.getByLabel('内置壁纸列表');
  const dynamic = page.getByLabel('动态壁纸列表');
  assert((await dynamic.boundingBox()).y > (await builtIn.boundingBox()).y);
  assert.equal(await dynamic.getByRole('button').count(), 3);
  assert.equal(await page.getByRole('button', { name: '使用动态壁纸：湖光微澜' }).count(), 0);
  assert.equal(await builtIn.getByRole('button', { name: /湖光微澜/ }).count(), 0);
  await page.getByRole('button', { name: '使用动态壁纸：书签群岛', exact: true }).click();
  await page.locator('[data-wallpaper-scene="bookmark-islands"]').waitFor();
  await page.screenshot({ path: '.codex-artifacts/bookmark-islands-settings.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1300);
  const canvas = page.locator('[data-wallpaper-scene="bookmark-islands"]');
  const anchors = page.locator('[data-wallpaper-anchor]');
  assert.equal(await anchors.count(), 7);
  const first = await anchors.first().boundingBox();
  const pixel = async (x, y) => canvas.evaluate((el, p) => {
    const ctx = el.getContext('2d');
    const rect = el.getBoundingClientRect();
    return Array.from(ctx.getImageData(Math.round(p.x * el.width / rect.width), Math.round(p.y * el.height / rect.height), 1, 1).data);
  }, { x, y });
  const start = { x: first.x + first.width / 2, y: first.y + first.height * .43 };
  const landArea = async rect => canvas.evaluate((el, rect) => {
    const ratio = el.width / el.getBoundingClientRect().width;
    const pixels = el.getContext('2d').getImageData(Math.round(rect.x * ratio), Math.round(rect.y * ratio), Math.round(rect.width * ratio), Math.round(rect.height * ratio)).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 16) if (pixels[i] > pixels[i + 2] * 1.06) count++;
    return count;
  }, rect);
  const land = await pixel(start.x, start.y);
  assert(land[0] > 220 && land[1] > land[2], 'bookmark has warm ivory sand below it');
  const sea = await pixel(1100, 130);
  assert(sea[1] > sea[0] * 1.4, 'empty region is turquoise sea');
  await page.screenshot({ path: '.codex-artifacts/bookmark-islands-desktop.png' });
  const oldArea = await landArea(first);
  await page.mouse.move(start.x, first.y + 25);
  await page.mouse.down();
  await page.mouse.move(start.x + 260, first.y + 170, { steps: 15 });
  await page.locator('[data-wallpaper-ghost]').waitFor();
  await page.waitForTimeout(600);
  const ghost = await page.locator('[data-wallpaper-ghost]').boundingBox();
  const movingLand = await pixel(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2);
  assert(movingLand[0] < movingLand[1] * 0.75, 'dragged bookmark floats over water with no following island');
  const ebbingArea = await landArea(first);
  assert(ebbingArea > 0 && ebbingArea < oldArea, 'source island remains but slowly shrinks');
  await page.waitForTimeout(1100);
  assert(await landArea(first) < ebbingArea, 'source island continues shrinking in place');
  await page.screenshot({ path: '.codex-artifacts/bookmark-islands-drag.png' });
  await page.mouse.up();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('[data-wallpaper-ghost]').count(), 0);
  const dropped = await anchors.first().boundingBox();
  const growingArea = await landArea(dropped);
  await page.waitForTimeout(2500);
  assert(await landArea(dropped) > growingArea, 'island slowly grows at the drop point');
  await page.screenshot({ path: '.codex-artifacts/bookmark-islands-after-drop.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(700);
  const stillA = await canvas.evaluate(el => el.toDataURL());
  await page.waitForTimeout(600);
  const stillB = await canvas.evaluate(el => el.toDataURL());
  assert.equal(stillA, stillB, 'reduced motion freezes ambient effects');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(1434, 450);
  await page.getByRole('button', { name: /无人之岛/ }).click();
  await page.waitForTimeout(1000);
  assert.equal(await anchors.count(), 0);
  await page.screenshot({ path: '.codex-artifacts/bookmark-islands-empty.png' });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '壁纸背景', exact: true }).click();
  assert.equal(await page.getByText(/拖动书签或文件夹|系统开启|切到后台自动暂停/).count(), 0);
  await page.getByRole('button', { name: '使用壁纸背景：湖光倒影', exact: true }).click();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('canvas').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: one dynamic wallpaper, no help text, no island following drag, gradual source shrinking, gradual growth after drop, reduced motion, empty desktop, switching cleanup, no browser errors.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
