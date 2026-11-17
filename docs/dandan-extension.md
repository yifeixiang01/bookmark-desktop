# Dandan 插件配套服务端部署

浏览器插件源码和本地安装说明位于同一仓库的 `codex/browser-extension` 分支；`main` 只维护网站及服务端。

## 上线顺序

1. 备份正式 PostgreSQL 数据库与当前网站部署产物。
2. 执行 `db/extension-upgrade.sql`：为 `user_states` 添加 `revision`，并创建授权码和插件会话表。脚本幂等，保留已有数据。
3. 配置 `PUBLIC_APP_URL=https://bookmark.yifeixiang.com.cn`，继续使用现有 `DATABASE_URL` 和 `APP_SECRET`。
4. 执行 `npm ci`、`npm run check`、`npm test`、`npm run build`，按现有平台流程部署网页和 API。
5. 确认 `/extension/authorize` 能加载 SPA，`/api/extension/*` 路由到 API。建议网关对授权接口配置请求限速。
6. 在 Chrome / Edge 安装插件后完成真实账号联调：邮箱登录 → 同意授权 → 多空间保存 → 网页查看。

旧版网页的无版本覆盖写入会被拒绝，请刷新以加载新版。若网页端和插件同时修改，版本不一致时网页提示先导出本地备份再刷新；不自动合并冲突。

## 授权与数据接口

- 网站 `/extension/authorize` 显示账号、插件 ID 与授权能力，由用户确认。
- `POST /api/extension/authorize`：网站 Cookie + Origin 校验，发放 60 秒一次性码。
- `POST /api/extension/token`：验证 PKCE S256、绑定回调后交换 30 天有效凭证。
- `GET /api/extension/spaces`：读取用户空间，必要时初始化空的“我的空间”；可通过 `url` 标记已收藏空间。
- `POST /api/extension/bookmarks`：事务内保存到多个空间，校验空间归属并跳过重复 URL（含文件夹内）。
- `POST /api/extension/logout`：撤销当前插件凭证。

数据库只保存授权码和访问凭证的 SHA-256 摘要。回调限定为 `https://<扩展ID>.chromiumapp.org/dandan`，随机 state 由插件验证。网页使用 revision 保存，事务锁按用户序列化，兼容多实例和 Supavisor。

## 验证

```powershell
npm run check
npm test
npm run build
```

数据库集成测试需指定允许创建 schema 的本地测试库；测试仅使用随机隔离 schema，结束后清理：

```powershell
$env:TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:5433/postgres'
npm test
```

不设置该变量时集成测试跳过。正式站尚需部署后真实账号验证。插件安装包需要在插件分支运行 `npm run package`，此分支不构建插件。
