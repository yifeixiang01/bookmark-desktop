# Dandan 浏览器插件（0.1.0）

适用 Chrome 和 Edge（Manifest V3），无需上架。默认连接 https://bookmark.yifeixiang.com.cn 。

## 构建和安装

```powershell
npm ci
npm run extension:check
npm run extension:package
```

构建目录：`extension/dist`。压缩包：`extension/Dandan-0.1.0.zip`。

在 Chrome 打开 `chrome://extensions`，或在 Edge 打开 `edge://extensions`，开启开发者模式，点击“加载已解压的扩展程序”，选择 `extension/dist`。ZIP 需要先解压，再选择解压目录，不能直接安装 ZIP。

## 使用

1. 点击工具栏 Dandan，选择“登录并授权”。
2. 在正式网站使用现有邮箱账号登录；没有账号时在网站注册。新账号默认有一个空的“我的空间”。
3. 在网站确认授权。插件不会保存密码；独立访问凭证 30 天有效，过期后重新授权。
4. 在普通 HTTP / HTTPS 网页点击 Dandan，或右键选择“保存书签”。右键链接保存链接本身，其他位置保存当前页面。
5. 修改标题、填写可选简介、勾选一个或多个空间，保存到空间顶层。右键链接时默认以链接 URL 为标题，可手动修改。
6. 同一空间内重复 URL（包括文件夹内）会跳过。按账号记住上次保存的空间。
7. 退出时撤销当前插件凭证。若断网退出，仅清除本机凭证，界面会明确提示。

浏览器内部页面、文件 URL 不支持收藏。未申请浏览历史、全部网站读取或浏览器原生书签权限。图标是临时 D 字图标。页面标题及图标取自浏览器，简介可手填。

## 服务端上线前置条件

**当前插件包依赖本分支新增的服务端接口；仅安装插件不能使旧版正式站支持授权。**

1. 备份正式数据库及旧版部署产物。
2. 在正式 PostgreSQL 执行 `db/extension-upgrade.sql`（幂等、增量建表，保留现有数据）。不要对未知的正式库执行开发环境数据库重建。
3. 配置 `PUBLIC_APP_URL=https://bookmark.yifeixiang.com.cn`，继续使用正式环境现有的 `APP_SECRET` / `DATABASE_URL`。
4. 同时部署本分支的网页端和 API：`npm run check`、`npm run build`，再按现有平台流程启动。
5. 确认反向代理让 `/extension/authorize` 返回 SPA 页面，并将 `/api/extension/*` 交给服务端。对授权和 token 接口配置合理的请求限速。
6. 用实际 Chrome / Edge 完成邮箱登录 → 确认授权 → 多空间保存 → 网页端查看的验收。

本次未部署、修改正式数据库或推送 GitHub。原来已打开的旧版网页在升级后无法整包保存，需要刷新加载新版网页；此行为防止旧客户端覆盖新收藏。若网页本地也有未上传修改，会提示先导出备份再刷新，当前不自动合并冲突。

## 授权与同步实现

- 浏览器 `identity.launchWebAuthFlow`，随机 state、PKCE S256，一次性授权码 60 秒有效，绑定 `chromiumapp.org/dandan` 回调。
- 网站显示当前邮箱和插件 ID，用户显式同意后才发码。批准请求校验网站 Origin。
- 服务端只存授权码及访问凭证的 SHA-256 摘要；凭证限定于插件空间查询、收藏和退出接口。
- PostgreSQL 事务和每用户事务锁序列化写入，避免多实例并发覆盖。
- 网页以 revision 比较后保存；回到网页且无本地待上传修改时自动拉取。冲突时阻止覆盖并提示备份。
- 插件草稿仅存浏览器 session storage，浏览器关闭后清除。访问凭证存扩展 local storage，限制为可信扩展上下文。

## 验证

```powershell
npm run check
npm run extension:check
npm test
npm run build
npm run extension:package
```

数据库集成测试需显式指定测试数据库（可创建 schema 的本地账号）。测试创建随机独立 schema，结束后删除，不读写现有业务表：

```powershell
$env:TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:5433/postgres'
npm test
```

无 `TEST_DATABASE_URL` 时数据库集成用例跳过。自动化已验证 Chromium 加载实际扩展、登录提示、账号刷新、多选空间、修改标题、保存载荷、重复收藏反馈和退出；该 UI 验证使用模拟接口，不代表正式站账号联调通过。
