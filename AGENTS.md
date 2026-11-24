# 本地开发

- 用户要求启动本地项目时同时启动本地数据库。优先运行 `npm run dev:local`，不要只运行 `npm run dev`。
- Windows 用户可双击根目录 `start-local.cmd`，它会启动项目本地 PostgreSQL、仅为空库初始化表结构、启动前端和 API，并打开浏览器。不要在日常启动时对已有库执行 `db:push`，以免删除额外表或字段。
- 本地数据库地址为 `127.0.0.1:5433/bookmark_desktop`，数据位于 `.local-data/postgres`。保留已有数据库与用户数据。
- 不要将本地启动流程改为连接云端数据库。
