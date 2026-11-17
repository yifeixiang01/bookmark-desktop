# Dandan

Chrome / Edge 浏览器插件：快速收藏当前网页或右键链接，并保存到账号下的一个或多个空间。

本分支只包含插件源码、临时图标和构建工具。网站授权页、服务端接口、数据库和云同步代码维护在 [main 分支](https://github.com/yifeixiang01/bookmark-desktop/tree/main)。

## 构建

需要 Node.js 20.19+ 或 22.12+。

```powershell
npm ci
npm run check
npm run lint
npm run package
```

- 源码：`extension/src`
- Manifest 与图标：`extension/public`
- 构建目录：`extension/dist`
- 安装包：`extension/Dandan-0.1.0.zip`

`npm run build` 只构建插件；`npm run package` 额外生成 ZIP（打包脚本使用 Windows PowerShell）。`npm run dev` 仅用于网页界面开发预览，实际扩展功能需加载构建目录验证。

## 安装与使用

1. Chrome 打开 `chrome://extensions`，或 Edge 打开 `edge://extensions`。
2. 开启开发者模式，点击“加载已解压的扩展程序”，选择 `extension/dist`。安装包需先解压。
3. 点击 Dandan → 登录并授权。在 https://bookmark.yifeixiang.com.cn 使用邮箱账号登录，再确认授权。没有账号时请先在网站注册。
4. 点击工具栏插件，或在网页右键选择“保存书签”。右键链接时保存链接，其他位置保存当前页。
5. 可修改标题、填写简介、选择多个空间。收藏保存到空间顶层，同空间已存在的网址会跳过，包括文件夹内已有书签。

按账号记住上次保存的空间。登录凭证有效期 30 天，退出时撤销；断网退出仅清除本机凭证，界面会提示。草稿保留在浏览器会话存储中，浏览器关闭后清除。

HTTP / HTTPS 网站可收藏；浏览器内部页面和文件页面不支持。右键链接的标题默认是 URL，可手动修改。当前采用临时 D 字图标，无需上架。

## 服务端依赖

默认服务地址为 `https://bookmark.yifeixiang.com.cn`，由 `extension/src/shared.ts` 配置。插件通过 `identity.launchWebAuthFlow` 打开 `/extension/authorize`，使用 state 和 PKCE S256，并通过 `/api/extension/*` 进行凭证交换、空间查询、收藏与退出。

**正式网站必须先部署 main 分支中的配套变更，插件才能使用真实账号完成授权和保存。** 参见 [网站部署说明](https://github.com/yifeixiang01/bookmark-desktop/blob/main/docs/dandan-extension.md)。只安装插件不会升级网站。

插件凭证不包含密码，只允许插件接口所支持的操作。权限为 `activeTab`、`contextMenus`、`storage`、`identity` 及正式网站访问权限，没有浏览历史和原生书签读取权限。
