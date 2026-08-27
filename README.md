# 赛博八卦

一个 Vue 3 六爻铜钱起卦体验应用：通过三枚虚拟方孔铜钱连续投掷六次，生成本卦、变卦、卦象和卦辞，并提供登录后使用的 AI 解卦前端流程。

当前 AI、账户和云端历史默认使用同源真实 `/api` 接口；本地开发由 Vite 代理到同层级后端仓库 `C:\Users\Administrator\Desktop\bagua_koa` 的服务端口。生产唯一公开 Origin 为 `https://bagua.whan.uk`，其 Vercel 项目 Rewrite 到 `https://bagua-koa.whan.uk/api/*`。浏览器始终只访问前端来源，因此 Cookie Session、CSRF 和 POST SSE 不依赖跨域请求。仅在独立界面开发时显式设置 `VITE_API_MODE=mock`，才使用遵守正式接口契约的浏览器本地 Mock。

## Quick start

```text
npm run harness:doctor
npm run harness:check
npm test
npm run test:components
npm run ci
```

开发预览：

```text
npm run dev
```

应用流程：欢迎页 → 六次起卦 → 可定位的本卦/变卦结果 → 登录或注册 → AI 对话。`npm test` 同时运行纯逻辑测试和挂载真实 Vue 页面/路由的回归测试。卦象数据与计算规则位于 `src/data/` 和 `src/utils/`，AI 前端状态与后端交接记录位于 `docs/ai-divination-frontend.md` 和 `docs/frontend-backend-handoff.md`。

## Repository map

- `AGENTS.md` — concise instructions and navigation for coding agents.
- `ARCHITECTURE.md` — system boundaries and design constraints.
- `docs/` — durable project knowledge and decision records.
- `.agents/skills/` — reserved for task-specific skills.
- `.harness/` — machine-readable harness configuration.
- `scripts/` — deterministic CLI and verification scripts.
- `tests/` — executable harness tests.

## Adding a skill

Create a directory under `.agents/skills/<skill-name>/` with a `SKILL.md`. Include when to use it, inputs, procedure, verification commands, and definition of done. Add scripts or references beside it when repeatability benefits from executable resources.
