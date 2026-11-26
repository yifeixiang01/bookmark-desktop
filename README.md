# 书签桌面

华为桌面风格的个人书签管理应用：分区/文件夹布局、自由拖拽排序、拖放合并成文件夹、3×3 大文件夹、网址信息自动抓取、邮箱注册登录与云端同步。

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Hono + tRPC 11 + Drizzle ORM
- **数据库**：PostgreSQL 17（兼容 Supabase）
- **构建产物**：单进程一体化 —— `dist/boot.js` 同时托管前端静态资源与 API

## Windows 本地一键启动

安装依赖（`npm ci`）、配置好 `.env` 中的 `APP_SECRET`，并安装 PostgreSQL 17 后，双击根目录 **`start-local.cmd`** 即可。

脚本会自动启动本地数据库，仅在空数据库首次启动时初始化表结构，再启动前端和 API，最后打开 <http://127.0.0.1:3000>。已有数据库直接复用，避免启动时删除额外的表或字段。修改代码后支持热更新，无需部署到云端。

也可以在终端运行：

```powershell
npm run dev:local
```

本地数据库使用 `127.0.0.1:5433/bookmark_desktop`，数据保存在 `.local-data/postgres`，会复用已有数据。启动脚本会为本次进程指定本地数据库，不修改 `.env` 中的连接地址。PostgreSQL 17 默认安装目录为 `C:\Program Files\PostgreSQL\17\bin`。

在终端按 `Ctrl+C` 停止开发服务，数据库会继续运行。需要停止数据库时运行 `npm run db:local:stop`；再次启动使用上述快捷脚本即可。若 3000 端口已被占用或被 Windows 保留，脚本会尝试 3100 等备用端口，以终端显示及自动打开的地址为准。

## 部署到自己的服务器

### 前置要求

- Node.js 20+
- PostgreSQL 数据库（自建或使用 Supabase）

### 方式一：Node.js 直接运行

```bash
# 1. 安装依赖
npm ci

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：必填 DATABASE_URL 和 APP_SECRET，详见文件内注释

# 3. 创建数据库（仅需一次）
#    createdb bookmark

# 4. 初始化表结构（仅需一次，后续表结构变更时重跑）
npm run db:push

# 5. 构建并启动
npm run build
npm start          # 监听 3000 端口
```

### 方式二：Docker

```bash
# 1. 先按上面第 2 步准备好 .env（会被打进镜像，请勿将镜像推送到公开仓库）

# 2. 构建镜像并运行
docker build -t bookmark-desktop .
docker run -d -p 3000:3000 --name bookmark bookmark-desktop

# 3. 初始化表结构（仅需一次，在能连到数据库的机器上执行）
DATABASE_URL="postgresql://..." npx drizzle-kit push
```

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL 连接串，如 `postgresql://postgres:pass@127.0.0.1:5432/bookmark` |
| `APP_SECRET` | ✅ | 登录会话 JWT 签名密钥，用 `openssl rand -hex 32` 生成 |
| `APP_ID` | 否 | 会话 clientId 占位，默认 `bookmark-desktop` |
| `OWNER_UNION_ID` | 否 | 管理员账号，邮箱用户填 `email:你的邮箱` |

`.env` 含敏感信息，已在 `.gitignore` 中忽略，请勿提交到公开仓库。

## 数据迁移

应用内置了数据导出/导入：登录后点右上角 **设置 → 导出书签** 得到 JSON 备份；在新部署的实例上 **导入书签** 即可完成迁移。

## 常用命令

### 暗夜模式

电脑端打开 **设置 → 字体外观 → 显示模式**，可选择明亮、暗夜或跟随系统。手机端在账号面板切换。模式仅保存在当前浏览器，不同步到账号，方便不同设备独立设置；刷新后保留选择。

```bash
npm run dev:local  # 同时启动本地 PostgreSQL、前端和 API（热更新）
npm run dev        # 仅启动 Vite/API，不负责启动数据库
npm run check      # TypeScript 类型检查
npm run build      # 构建前端 + 打包后端到 dist/
npm start          # 生产模式启动
npm run db:push    # 同步数据库表结构
```

## 升级已有部署

生产服务会在监听端口前执行增量数据库升级，补齐 `user_states.revision` 和浏览器扩展授权表。升级可重复执行，只添加字段和表，不覆盖已有书签与应用数据。Docker 镜像也包含该升级流程，无需另行安装 SQL 客户端。数据库账号需要创建表和修改表的权限；升级失败时服务不会启动，具体错误会写入部署日志。首次部署仍需先执行 `npm run db:push` 初始化基础表。

如果旧部署登录后出现“云端数据加载失败”，且数据库日志报 `column "revision" does not exist`，可重新部署包含自动升级的新镜像；也可连接生产数据库手动执行 `db/extension-upgrade.sql` 后刷新页面。只升级本地数据库不会修改云端数据库。

## 移动端 PWA

生产构建包含 PWA 清单、独立窗口启动配置、安装图标和 Service Worker。部署到 HTTPS 域名后，安装的应用默认打开 `/mobile`。本地可使用 `npm run build` 和 `npm run preview` 在 localhost 验证；开发模式不会注册 Service Worker。

- Android Chrome / Edge：打开移动端管理菜单，点击“安装到主屏幕”（浏览器满足安装条件时显示），也可以通过浏览器菜单安装。
- iPhone / iPad：使用 Safari 打开网站，点“分享 → 添加到主屏幕”。
- Service Worker 只缓存公开的断网提示页，不缓存登录页面、用户书签或 API 响应。离线打开时显示重连页面；读取书签与云端同步仍需联网。
- 更新通过浏览器正常的 Service Worker 生命周期生效，不强制刷新正在编辑的页面。代理或 CDN 请对 `/sw.js` 和 HTML 使用重新验证策略，避免长期缓存。
