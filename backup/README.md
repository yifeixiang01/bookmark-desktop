# PostgreSQL 自动备份到腾讯云 COS：部署与排障经验

记录日期：2026-11-27。适用项目：bookmark-desktop；实际操作界面：Dokploy v0.29.7。

## 1. 方案与备份范围

执行流程：**Dokploy 定时任务 → backup 容器 → pg_dump 导出 → age 加密 → COS 上传**。

- 备份整个连接的 PostgreSQL 数据库，包括表结构、用户与密码哈希、空间/书签、应用状态、文章及插件授权数据。
- 不备份数据库集群角色、环境变量、APP_SECRET、age 私钥和数据库外的文件。这些需另行安全保存。
- 图标、封面等若只保存外部 URL，备份保存的是 URL，不会下载外部图片。
- 每日一次备份可能丢失上次成功备份后的数据。服务器停机期间不会生成新备份，但已上传 COS 的备份仍然存在。

| 项目文件 | 用途 |
| --- | --- |
| `backup/Dockerfile` | 提供 PostgreSQL 18 客户端、Node.js、age |
| `backup/backup-db.mjs` | 导出、加密、计算校验值、上传及清理临时文件 |

## 2. 本次资源信息

| 项目 | 值 |
| --- | --- |
| COS 完整桶名 | `bookmark-backup-1439412903` |
| COS 地域 | `ap-guangzhou`（广州） |
| APPID | `1439412903`，即桶名末尾数字；不是账号 UIN |
| 对象前缀 | `bookmark-db` |
| Dokploy 应用 | `backup` |
| 数据库内部地址 | `bookmark-database-iczonu:5432`，迁移后以实际地址为准 |
| 定时执行 | 每天北京时间 03:00 |

## 3. COS 与专用访问密钥

### 3.1 存储桶

桶保持**私有读写**。备份不需要公开访问、网站域名或 CDN。

### 3.2 CAM 子用户和权限

1. 腾讯云控制台 → 访问管理 CAM → 用户 → 用户列表 → 新建用户。
2. 创建专用子用户，例如 `bookmark-backup`，选择编程访问/API 密钥访问。
3. 授权页面选择「新建自定义策略 → 按策略语法创建 → 空白模板」。
4. 策略名称填写 `BookmarkBackupUpload`，粘贴以下内容。
5. 保存后返回授权页面，刷新列表、搜索并勾选策略，再完成用户创建。
6. 保存 SecretId、SecretKey。已有用户可在用户详情的「API 密钥」中新建。

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": ["name/cos:PutObject"],
      "resource": [
        "qcs::cos:ap-guangzhou:uid/1439412903:bookmark-backup-1439412903/bookmark-db/*"
      ]
    }
  ]
}
```

此策略仅允许上传指定桶的 `bookmark-db/` 目录，不包含读取、删除或管理其它桶的权限。不要勾选 AdministratorAccess、QCloudResourceFullAccess；自助管理 API 密钥/MFA 权限也不需要。

更换桶、地域、APPID 或 COS_PREFIX 时需同步修改策略。下载、生命周期和删除操作由管理员执行。

## 4. Windows 生成 age 加密密钥

在自己的管理电脑 PowerShell 执行：

```powershell
winget install --id FiloSottile.age --exact
```

重新打开 PowerShell：

```powershell
age-keygen --version
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\BackupKeys"
age-keygen -o "$env:USERPROFILE\BackupKeys\bookmark-backup-identity.txt"
age-keygen -y "$env:USERPROFILE\BackupKeys\bookmark-backup-identity.txt"
```

- 输出的 `age1...` 是公钥，配置到 BACKUP_AGE_RECIPIENT，不包含 `Public key:`。
- 文件内 `AGE-SECRET-KEY-...` 是私钥。文件另存密码管理器或加密介质，不放 Git、Dokploy 或聊天中。
- 文件已存在时不要覆盖；旧备份需要原私钥解密。丢失私钥即无法恢复。
- winget 不可用时，从 [age 官方 Releases](https://github.com/FiloSottile/age/releases) 下载 Windows 包，在解压目录使用 `./age-keygen.exe`。

## 5. Dokploy 创建独立 backup 应用

### 5.1 构建配置

在与网站相同项目中创建应用 `backup`：

| 配置项 | 内容 |
| --- | --- |
| 仓库 | `git@github.com:yifeixiang01/bookmark-desktop.git` |
| 分支 | `main` |
| 构建类型 | Dockerfile |
| Dockerfile 路径 | `backup/Dockerfile` |
| Build Context | 仓库根目录 `.` |

私有 SSH 仓库需要在 Dokploy 关联 SSH 私钥，并在 GitHub 仓库授权对应公钥。backup 不需要公网域名或网站 HTTP 健康检查。

### 5.2 运行环境变量

配置在 **backup 应用 → Environment**，示例中的密码、公钥和密钥需自行替换：

```dotenv
DATABASE_URL=postgresql://数据库用户:URL编码后的密码@bookmark-database-iczonu:5432/bookmark
COS_BUCKET=bookmark-backup-1439412903
COS_REGION=ap-guangzhou
COS_ENDPOINT=https://cos.ap-guangzhou.myqcloud.com
COS_SECRET_ID=专用子用户SecretId
COS_SECRET_KEY=专用子用户SecretKey
COS_PREFIX=bookmark-db
BACKUP_AGE_RECIPIENT=age1你的公钥
```

注意：

- 数据库名 `bookmark` 以实际部署为准；数据库和 backup 容器需处于可互通的 Docker 网络。
- 容器内 localhost 指向自己，不能用于连接另一个数据库容器。使用内部服务名及 5432 端口。
- 密码中的 `@`、`#`、`%` 等特殊字符需 URL 编码。优先使用有全部目标表读取权限的专用数据库账号。
- COS_ENDPOINT 可省略，默认根据地域生成；填写时使用上面的地域地址，不额外拼接桶名。
- 密钥只通过运行时环境传入，不写进仓库或镜像。
- 网站应用可以删除 COS_* 和 BACKUP_AGE_RECIPIENT；**网站原有 DATABASE_URL、APP_SECRET 必须保留**。

### 5.3 容器常驻

本版本 Dokploy 的 Schedules 在运行容器中执行命令，因此 backup 容器需保持运行。

向右滚动应用标签栏 → **Advanced → Run Command**：

| 字段 | 填写 |
| --- | --- |
| Command | `sleep` |
| Arguments（单独一项） | `infinity` |

点击 Save，再回 General 执行 Redeploy。仅保存不代表新配置已作用于旧容器。

仓库 Dockerfile 默认运行一次备份后退出；此处覆盖默认命令供定时任务使用。不要用容器反复自动重启代替定时备份。

## 6. 首次手动执行

部署日志出现 `Docker build completed` 只证明镜像构建成功，不代表备份成功。

进入 **backup 容器终端**，不是网站、数据库或宿主机终端：

```sh
node --version
pg_dump --version
age --version
ls -l /backup/backup-db.mjs
pg_isready -d "$DATABASE_URL" -t 10
node /backup/backup-db.mjs
```

本次工具版本：Node 24.22.3、pg_dump 18.7、age 1.3.2。数据库返回 accepting connections 只证明服务可达，不证明账号具备完整导出权限。

新脚本先输出阶段日志，再输出成功结果：

```text
[backup] Starting PostgreSQL export and age encryption ...
[backup] Export and encryption completed; encrypted bytes: ...
[backup] Uploading encrypted backup to COS ...
{"ok":true,"key":"bookmark-db/daily/2026-11-27/bookmark-db-2026-11-27T19-00-00-000Z.dump.age","bytes":12345}
```

到 COS 确认对应文件存在、大小非零。之后仍需做恢复验证，不能只看上传成功。

## 7. 创建自动备份任务

backup → Schedules → Add Schedule：

| 字段 | 值 |
| --- | --- |
| Task Name | 数据库每日备份 |
| Description | 每天备份 PostgreSQL，加密后上传腾讯云 COS |
| Schedule | 自定义 `0 3 * * *` |
| Timezone | `Asia/Shanghai` |
| Shell Type | `Sh`，不是 Bash |
| Command | `node /backup/backup-db.mjs` |
| Enabled | 开启 |

若只能使用 UTC，时间表达式改为 `0 19 * * *`。表单中的 `npm run backup` 是示例占位，项目没有这个 npm 命令。

任务卡片上的 ▶ 用于立即执行一次，剪贴板查看执行记录，铅笔编辑任务，垃圾桶删除任务。创建后先点 ▶ 验证调度器能成功执行。

后续不必每天手动运行、打开网页或重新部署。backup 容器及 Dokploy 调度服务必须运行；停机维护后应检查漏跑并手动补备份。

## 8. 如何检查每天凌晨 3 点执行

1. 编辑任务，核对 Asia/Shanghai、`0 3 * * *` 和 Enabled。
2. 次日查看执行记录，确认开始时间为北京时间 03:00 左右，状态成功、日志包含 `ok:true`。
3. COS 每天应新增一份文件，核对最后修改时间。首次连续检查两三天。

**脚本文件名和目录日期使用 UTC。** 北京时间 11 月 28 日 03:00 对应 UTC 11 月 27 日 19:00，目录为 `2026-11-27/`、文件名含 `19-00-...Z` 是正常情况。

建议另外配置任务失败通知及“超过 26 小时没有成功备份”的告警。这些需在平台/监控中单独配置，脚本没有内置外部通知。

## 9. 常见问题与排查

| 现象 | 原因与处理 |
| --- | --- |
| SSH 仓库提示没有 key | Dokploy 关联私钥，GitHub 仓库授权对应公钥 |
| 部署成功但 COS 没文件 | sleep infinity 不执行备份；手动运行脚本或触发 Schedule，查看任务日志 |
| 长时间没有任何输出 | 旧版只有上传成功才输出；升级新脚本查看阶段日志 |
| pg_isready 返回 no response | 检查数据库内部地址、端口与容器网络 |
| pg_dump 尝试连接 /run/postgresql/.s.PGSQL.5432 | 没有使用远程连接参数。脚本需显式传入 `--dbname` 和 DATABASE_URL，不能仅依赖 PGDATABASE 中的 URI；重新部署修复版本 |
| authentication failed / permission denied | 检查数据库账号、密码 URL 编码和对所有目标表的权限 |
| PathStyleDomainForbidden（403） | 改用 COS 虚拟主机式访问，见下节 |
| AccessDenied（403） | 检查 CAM 密钥、桶、地域、PutObject 权限及前缀。并非所有 403 都是授权不足 |
| pg_dump 版本不兼容 | pg_dump 不能旧于数据库主版本；本次使用 postgres:18-alpine，数据库升级后同步检查 |
| Bash not found | Schedule 的 Shell Type 选 Sh |
| 配置保存后仍是旧行为 | Save 后 Redeploy，确认 backup 拉取 main 新代码，不是只重启网站 |
| 容器反复退出并备份 | 检查启动配置是否覆盖为 sleep + infinity，避免默认命令被自动重启重复执行 |

### 9.1 本次 COS 403 的实际原因

实际错误：

```text
PathStyleDomainForbidden: The bucket you are attempting to access must be addressed using COS virtual-styled domain.
```

最初脚本使用 `forcePathStyle: true`，被 COS 拒绝。修复配置为：

```js
endpoint: 'https://cos.ap-guangzhou.myqcloud.com',
forcePathStyle: false,
requestChecksumCalculation: 'WHEN_REQUIRED',
```

实际请求域名应是：

```text
bookmark-backup-1439412903.cos.ap-guangzhou.myqcloud.com
```

永久修复在提交 `830c1c9`，同时增加阶段日志、数据库连接超时 10 秒、导出加密上限 5 分钟、上传上限 120 秒，以及失败后的进程清理。重新部署该提交或更新版本。

容器内修改文件只适合临时排障，重新部署会被镜像覆盖。

### 9.2 诊断命令

在 backup 容器终端执行：

```sh
pg_isready -d "$DATABASE_URL" -t 10
timeout 120 node /backup/backup-db.mjs
echo "退出码=$?"
```

退出码 124 表示外部 timeout 终止了命令；0 表示脚本成功，其它非零表示失败。这个 120 秒限制仅用于快速诊断，大库正式执行不要使用该外部限制。

不要打印完整环境变量或将 SecretKey、数据库密码发到日志/聊天中。

### 9.3 首次构建很慢

本次 GitHub 克隆约 13.79 MiB、速度约 28–37 KiB/s；系统依赖安装 apk add 约 1706 秒（28 分钟）；npm 安装约 36 秒。

每天备份只执行脚本，不重复构建，不需要等这段时间。保持 Docker 缓存；后续仍慢时再考虑国内可稳定访问的软件源或预构建镜像。

## 10. 下载校验与恢复演练

管理员从 COS 下载 `.dump.age` 文件。对象自定义元数据 sha256 保存的是加密文件的 SHA-256，Windows 校验命令：

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\Backups\实际文件名.dump.age'
```

与 COS 元数据比较，十六进制大小写不影响结果。然后在有 age 和兼容 PostgreSQL 客户端的安全环境执行：

```sh
age --decrypt --identity bookmark-backup-identity.txt --output backup.dump 实际文件名.dump.age
pg_restore --list backup.dump
createdb -h 127.0.0.1 -p 5432 -U postgres bookmark_restore
pg_restore --exit-on-error --no-owner --no-privileges -h 127.0.0.1 -p 5432 -U postgres --dbname bookmark_restore backup.dump
```

这里的路径、端口和账号应改为恢复环境实际值；项目本地数据库是 5433。**先恢复到隔离的空库 bookmark_restore，不覆盖生产库。** 不要在日常启动流程中对已有数据库运行 db:push。

恢复验收：

- users、user_states、articles 等表和代表性记录存在。
- 用测试应用连接恢复库，确认登录、书签空间和应用状态可读取。
- 环境变量和 APP_SECRET 从单独保存的部署配置恢复；数据库全局角色需另行创建。
- 正式灾后切换时，可在恢复库中清理旧插件会话/短期授权并重新登录授权；演练不修改原生产库。
- 验证后清理明文 dump 和临时环境，保留加密备份与私钥。

首次备份成功后立即演练，之后至少每月一次，记录恢复耗时与结果。上传成功不能代替恢复验证。

## 11. 保留策略和维护

- 可在 COS 为 `bookmark-db/daily/` 配置生命周期，例如保留 35 天；启用前确认历史保留需求。
- 当前脚本只生成 daily，不会生成 weekly/monthly 副本；长期分层保留需另行实现。
- 可按需求开启版本控制或保留锁，结合费用与服务限制配置。备份上传密钥不需要删除权限。
- 凭证变更、公钥轮换或数据库升级后，立即手动验证一次。保留旧 age 私钥以解密旧备份。
- 当前没有任务互斥锁；上一份未结束时不要反复点击 ▶，采用单实例调度。
- Git 仓库、部署配置、恢复账号和私钥不能只保存在应用服务器上。

## 12. 验证状态与遗留事项

本次已确认：镜像构建成功、工具可用、数据库内部地址可达、COS 拒绝旧路径式访问；本地已验证修复版本生成正确的虚拟主机式请求，脚本语法检查通过。

仍需以实际结果确认：修复后上传成功、连续每日 03:00 执行、告警配置及完整恢复演练。没有线上执行记录和恢复结果时，不将这些项目记为已完成。
