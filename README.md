# 书签桌面

华为桌面风格的个人书签管理应用：分区/文件夹布局、自由拖拽排序、拖放合并成文件夹、3×3 大文件夹、网址信息自动抓取、邮箱注册登录与云端同步。

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Hono + tRPC 11 + Drizzle ORM
- **数据库**：MySQL 8（兼容 TiDB / MariaDB 10.5+）
- **构建产物**：单进程一体化 —— `dist/boot.js` 同时托管前端静态资源与 API

## 部署到自己的服务器

### 前置要求

- Node.js 20+
- MySQL 8 数据库（自建或使用云数据库）

### 方式一：Node.js 直接运行

```bash
# 1. 安装依赖
npm ci

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：必填 DATABASE_URL 和 APP_SECRET，详见文件内注释

# 3. 创建数据库（仅需一次）
#    mysql> CREATE DATABASE bookmark CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
DATABASE_URL="mysql://..." npx drizzle-kit push
```

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | MySQL 连接串，如 `mysql://root:pass@127.0.0.1:3306/bookmark` |
| `APP_SECRET` | ✅ | 登录会话 JWT 签名密钥，用 `openssl rand -hex 32` 生成 |
| `APP_ID` | 否 | 会话 clientId 占位，默认 `bookmark-desktop` |
| `OWNER_UNION_ID` | 否 | 管理员账号，邮箱用户填 `email:你的邮箱` |

`.env` 含敏感信息，已在 `.gitignore` 中忽略，请勿提交到公开仓库。

## 数据迁移

应用内置了数据导出/导入：登录后点右上角 **设置 → 导出书签** 得到 JSON 备份；在新部署的实例上 **导入书签** 即可完成迁移。

## 常用命令

```bash
npm run dev        # 本地开发（Vite 热更新）
npm run check      # TypeScript 类型检查
npm run build      # 构建前端 + 打包后端到 dist/
npm start          # 生产模式启动
npm run db:push    # 同步数据库表结构
```
