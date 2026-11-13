# GitHub Radar · 开源技术雷达

中文网页，帮助发现 GitHub 新项目、新技术和值得继续研究的方向。支持方向、语言、关键词筛选、项目详情和浏览器本地收藏。

[在线打开 GitHub Radar](https://rongkangqi.github.io/github-tech-radar/)

页面采用深色首屏、荧光绿强调色、雷达芯片视觉与顶部导航。技术方向按领域展示，项目区提供可筛选的卡片网格，并适配手机布局。

网页由 GitHub Pages 托管；GitHub Actions 每小时采集公开仓库数据，关闭网页后也会运行。浏览器只读取已发布的 JSON，不需要登录 GitHub，不包含访问令牌。

## 数据与统计

- 新项目：近 7、30 或 90 天创建，至少 20 Star，按累计 Star 取前 100 个。
- 活跃热门：近 7 天有提交、至少 500 Star，按累计 Star 取前 100 个。
- 排除 Fork 和已归档仓库，合并去重；按有限规则隐藏商业软件下载推广。
- 方向与语言分布表示这个样本的项目数量；不是全站份额，也不是 GitHub 官方 Trending 榜单。
- Star 是累计值；有上次快照时，详情显示两次采集之间的实际差值。
- 数据源为 [GitHub Repository Search API](https://docs.github.com/en/rest/search/search#search-repositories)，项目能力和许可证以原仓库为准。

采集时间显示在页面上。单个范围采集失败时保留上次结果并标注；全部查询失败时工作流失败，保留上次成功发布的网站。超过 3 小时未更新，页面会提示。

## 在 GitHub Pages 上部署

1. 在自己的 GitHub 账号下创建仓库，上传本目录的源文件（包括 `.github/workflows/pages.yml`），默认分支使用 `main`。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Sync GitHub radar and deploy Pages → Run workflow** 手动运行首次部署。
4. 成功后在该工作流的 `github-pages` 环境中打开网址。

GitHub Free 账号使用公开仓库部署 Pages。网站公开可访问；若仓库也公开，源代码和数据快照也公开。[GitHub Pages 官方部署说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

工作流使用 GitHub 自动提供的 `GITHUB_TOKEN`：读取公开数据、提交新快照、部署 Pages；不需要上传个人 SSH 私钥，也不需要配置个人访问令牌。每次数据采集后将 JSON 写入仓库，以便下一轮比较 Star。推送冲突、分支保护或禁用 Actions 会使更新停止，可在 Actions 中查看失败原因。

定时任务设为每小时第 37 分钟（UTC），GitHub 调度可能延迟。公开仓库长期无活动时，GitHub 可能停用定时工作流；可在 Actions 中重新启用。页面的“检查更新”读取最近发布结果；立即重新采集可手动运行工作流。

## 本地使用

需要 Node.js 24 或更高版本。

```sh
npm ci
npm run sync
npm run dev
```

无令牌采集受 GitHub 匿名 API 频率限制。本地采集失败时可继续使用随仓库保存的数据快照。

验证和构建：

```sh
npm run check
npm test
npm run build
npm run preview
```

`dist/` 是最终静态网站。资源和 JSON 路径使用相对地址，可部署在仓库子路径。收藏保存在当前浏览器，切换设备或清除浏览器数据后不会保留。
