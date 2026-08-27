# AI 解卦前后端交接

> 最近更新：2026-08-26
>
> 后端真实路径：`C:\Users\Administrator\Desktop\bagua_koa`（与本项目同层级，不在本项目内部）

## 前端已形成的接力边界

- Vue Router 页面：`/`、`/result/:castId`、`/login`、`/register`、`/ai/:castId`、`/ai/conversations/:conversationId` 和 404。
- 匿名历史会把旧 `id + lines` 记录迁移为稳定 `clientId`，同时保存 `schemaVersion`、确定的本卦和可选变卦摘要。
- 结果和 AI 初始化只按明确 `castId` 解析记录；缺失时不回退到最新一卦。
- 页面只调用 `src/api/` 下的鉴权、卦象和对话模块。默认 Mock 与真实 `/api` 使用相同公开函数。
- 受保护路由会在 Session 未知时检查会话，未登录时保留完整站内回跳路径；外部重定向会被拒绝。
- AI 消息使用 POST SSE，解析 `message.start`、`message.delta`、`message.done` 和 `error`；停止生成会同时调用显式取消接口并通过 `AbortController` 关闭本地流。

## 运行模式

- 默认或设置 `VITE_API_MODE=real`：使用同源 `/api`。本地 Vite 将 `/api` 代理到 `http://localhost:3000`。
- 生产唯一公开 Origin 为 `https://bagua.whan.uk`。其 Vercel 项目由仓库根目录 `vercel.json` 优先把 `/api/*` Rewrite 到 `https://bagua-koa.whan.uk/api/*`，其余路径回退到 `index.html`；浏览器不直接跨域访问后端。
- 仅显式设置 `VITE_API_MODE=mock`：使用浏览器本地 Mock，可独立验收界面流程。
- 确定性测试入口使用 `/?test=6,7,8,9,7,8`，不再占用 URL hash。

Mock 仅用于开发和界面验收，不承担真实安全或配额控制。真实限制、资源归属、幂等和事务由后端实现。

账户历史抽屉以服务端分页结果为主，同时单独列出可直接查看的本机未合并记录；合并不是查看本机记录的前置条件。发现本机匿名记录时先征得用户确认，再调用批量合并。旧版非 UUID 标识由前端稳定迁移后再提交；服务端确认创建或重复后才从匿名空间移除对应记录，并将非敏感卦象摘要放入按用户隔离的本地缓存；退出登录时清除该账户缓存。

历史抽屉支持逐条删除。本机记录只从当前浏览器移除；账户记录调用 `DELETE /api/divinations/:id`，并明确提示关联 AI 对话会一并永久删除。删除成功或服务端已不存在时，前端同步清除账户缓存和当前设备上同 `clientId` 的副本，避免记录重新出现或再次合并。

## 后端第一条接力链路

1. 未登录调用 `POST /api/ai/conversations` 返回统一 401。
2. 登录或注册设置 Cookie Session；`GET /api/auth/session` 返回用户摘要和可读 CSRF Cookie。
3. 前端用当前 `clientDivinationId` 和确定卦象创建或恢复对话。
4. 后端返回“所问何事？”及确定性 `oracleContext`。
5. `POST /api/ai/conversations/:conversationId/messages` 返回标准 SSE。
6. `POST /api/ai/conversations/:conversationId/messages/:clientMessageId/cancel` 幂等取消当前生成。
6. 刷新后 `GET /api/ai/conversations/:conversationId` 可恢复消息。

## 联调验收

- 登录后仍返回原始 `castId`，不切换到其他卦象。
- 相同 `castId` 重复初始化恢复同一对话；不同 `castId` 即使卦象相同也建立不同对话。
- Cookie、CSRF、401、429 和稳定错误码经过真实响应验证。
- 客户端停止、断网、服务端错误和刷新恢复均留下正确消息状态。
- 前后端各自运行完整 CI，浏览器完成桌面与 375px 纵向链路复测。
