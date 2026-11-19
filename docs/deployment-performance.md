# Dokploy 部署耗时优化

本次日志中 Docker 依赖层 `npm ci` 已命中缓存，应用构建约 11.9 秒、镜像导出约 1.3 秒。主要瓶颈是 SSH 从 GitHub 拉取约 28.67 MiB，平均速度仅 25 KiB/s，按此均速估算约 20 分钟。日志没有完整时间戳，不能精确还原总耗时。

## 已做调整

- `.codex-artifacts/` 为本地截图、验证脚本和性能记录，不再纳入 Git；已有本地文件保留。
- 六张内置照片转为 WebP，最长边 2560px；壁纸 ID 不变，旧账号无需重新选择壁纸。原始图片来源与许可保留在 `public/wallpapers/SOURCES.txt`。
- Docker 构建上下文排除验证产物、本地缓存、环境文件和文档等；运行时环境变量在 Dokploy 中配置。
- 保留依赖文件独立复制的缓存层，并用 BuildKit npm 下载缓存加速依赖变化后的安装。

## Dokploy 配置

1. 继续使用 Dockerfile 构建，Dockerfile 路径 `Dockerfile`，上下文为项目根目录。
2. 保留 Docker 构建缓存，日常更新不要启用无缓存构建或清理构建缓存。
3. 若 Git 源设置提供 shallow clone / clone depth，使用深度 `1`。当前日志对象数量较少，看起来已是浅克隆，但需在 Dokploy 配置中确认。
4. 下一次部署比较 `Receiving objects ... done` 的总下载大小和速度。`.dockerignore` 仅减少 Docker 上下文，不会减少 Git 克隆量；停止跟踪验证目录和转换图片在浅克隆最新版本时才能减少下载。

若完整克隆全部历史，旧截图和照片依然存在 Git 历史中。优先开启浅克隆，不需要重写历史。

## 进一步提速

如果瘦身后 GitHub 下载速度仍然只有数十 KiB/s，网络仍是主瓶颈。可以在 GitHub Actions 构建并推送镜像至服务器可快速访问的镜像仓库，再将 Dokploy 构建类型改为 Docker Image：服务器只拉镜像，不再克隆源码和编译。该方案需先配置镜像仓库凭据、工作流及 Dokploy 镜像来源。

本地验证：`npm run check`、`npm run build`。Docker 缓存命中及服务器总耗时需以下一次真实部署日志为准。
