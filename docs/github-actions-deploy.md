# main 自动构建镜像并部署

推送 `main` 后，GitHub Actions 自动构建 Docker 镜像并发布至 GHCR。也可在仓库 Actions 页面选择「构建并发布部署镜像」手动运行。构建成功后才更新镜像标签、触发可选部署 Webhook。

## 镜像地址

- 日常部署：`ghcr.io/yifeixiang01/bookmark-desktop:latest`
- 固定版本/回滚：`ghcr.io/yifeixiang01/bookmark-desktop:sha-<完整40位提交编号>`
- 架构：`linux/amd64`。若部署服务器为 ARM64，需先调整工作流的平台配置。

发布使用 GitHub 自动提供的 `GITHUB_TOKEN`，不需要额外保存镜像写入密码。首次运行可能需要等待基础镜像和依赖下载；后续通过 GitHub Actions 缓存复用构建层。

## Dokploy 一次性切换

1. 先到 GitHub 仓库 Actions 确认一次镜像发布成功。
2. 在 Dokploy 的当前应用中，将**源码来源 / Provider** 从 Git 改为 **Docker / Docker Image**，填写上面的 `latest` 镜像地址。不要只在 Git 源下修改构建方式，否则仍会拉取仓库。
3. 保留当前域名、数据库连接、APP_SECRET、其他环境变量及持久化挂载。容器端口保持 `3000`，使用镜像自带启动命令。
4. GHCR 包初次发布通常为私有。在 GitHub 个人主页 Packages 中，将该包设为 Public，或在 Dokploy 配置 GHCR 仓库登录：用户名为 GitHub 用户名，密码使用仅具备 `read:packages` 权限且可访问此包的个人访问令牌。令牌不要写进代码或聊天。
5. 手动部署一次，确认 Dokploy 成功拉取镜像、页面正常、账号和数据正常。
6. 关闭 Dokploy 原有的 Git 推送自动部署，避免每次推送同时触发源码部署和镜像部署。

## 自动触发部署（可选）

完成上面的镜像切换后，从 Dokploy 当前应用的部署设置复制专用 **部署 Webhook URL**（版本不同名称可能不同）。在 GitHub 仓库 Settings → Secrets and variables → Actions 添加仓库 Secret：

`DOKPLOY_DEPLOY_WEBHOOK` = 完整的 HTTPS 部署 Webhook URL

该 URL 必须能通过 POST 直接触发当前应用部署，并能够由 GitHub 托管 Runner 访问。它不是 Dokploy 首页地址或 GitHub Git 推送 Webhook；如果当前 Dokploy 版本只提供带 API Key 的 API，请先保持手动部署，另行配置 API 调用，不要将 API 地址填入此 Secret。

未配置 Secret 时，工作流照常构建发布镜像，在 Dokploy 点击部署即可。配置后，仅在镜像成功发布后发起一次部署请求；请求成功不等于部署完成，部署状态以 Dokploy 日志为准。

## 排查

- Actions 报 `permission_denied`：确认仓库允许 Actions 发布 Packages；旧的同名包需在包设置的 Actions access 中授权本仓库。
- 拉镜像慢：GHCR 也可能受服务器网络影响。若下载仍慢，可换到服务器访问更快的镜像仓库；自动构建的流程可继续使用。
- 回滚：在 Dokploy 将镜像改为对应提交的 `sha-...` 标签，然后部署；回滚期间停用自动部署 Webhook，防止下次推送重新切到最新版本。

工作流并发执行会串行处理发布，避免较旧构建最后完成而覆盖新镜像；GitHub 可能合并等待中的推送，最终发布最新版本。
