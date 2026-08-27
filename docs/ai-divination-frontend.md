# AI 解卦前端产品与接口规格

> 文档状态：已确认，作为 AI 解卦前端实施依据
>
> 版本：1.0
>
> 确认日期：2026-08-21
>
> 范围：前端路由、登录注册、AI 入口、历史记录、对话初始化与接口契约；暂不包含后端实现

## 1. 背景与目标

现有产品允许任何用户无需登录完成欢迎、起卦、查看结果和查看本地历史。新增 AI 解卦后，必须继续保持这些公开能力，只在用户主动进入 AI 对话时要求登录。

本期目标：

- 现有欢迎、起卦、结果和历史浏览不限制登录。
- 结果页提供“AI 解读此卦”入口。
- 未登录用户点击入口后前往登录页；注册成功后仍停留在匿名态并返回登录页，完成独立登录后才回到原来的卦象并进入 AI 对话。
- 已登录用户直接进入 AI 对话。
- AI 对话必须绑定用户当前查看的具体卦象，不得简单读取 localStorage 中最新一条记录。
- 未登录历史继续可用；登录后支持服务端历史和本机匿名历史合并。
- 在没有后端时，前端通过稳定的 API 边界和 Mock 实现推进页面开发。

## 2. 明确决策

1. 引入 Vue Router，页面级功能不再继续堆叠在根组件的 `phase` 状态中。
2. 使用 Cookie Session 鉴权，前端不保存 access token 或 refresh token。
3. AI 路由需要登录；其他现有页面保持公开。
4. 第一版只在结果页提供 AI 主入口。用户从历史抽屉打开旧记录后，会进入同一个结果页，因此同样可以解读历史卦象。
5. 历史采用混合模式：匿名记录保存在 localStorage，账户记录以服务端为主，本地仅承担即时写入和缓存。
6. AI 对话初始化以明确的 `castId` 为依据，不使用“最新记录”作为隐式上下文。
7. AI 回复固定采用 SSE 流式 HTTP；前端通过 `fetch()` 发起 `POST` 并解析 `text/event-stream`，不使用原生 `EventSource`、NDJSON 或 WebSocket。
8. 前端全部使用 JavaScript，不引入 TypeScript；函数、模块、数据结构和公共接口的代码文档采用 JSDoc。
9. AI 页面继续展示文化体验边界，不将输出描述为确定预测，也不替代医疗、法律、投资等专业判断。

## 3. 页面与路由

### 3.1 路由表

| 路径 | 页面职责 | 登录要求 |
|---|---|---|
| `/` | 现有欢迎和起卦流程 | 否 |
| `/result/:castId` | 展示指定卦象结果 | 否 |
| `/login` | 邮箱和密码登录 | 否 |
| `/register` | 邮箱验证码注册 | 否 |
| `/ai/:castId` | 校验指定卦象并创建或恢复 AI 对话 | 是 |
| `/ai/conversations/:conversationId` | 展示已经建立的 AI 对话 | 是 |
| `/:pathMatch(.*)*` | 404 或返回首页 | 否 |

历史记录继续使用全局抽屉，不单独建立路由。点击历史记录后进入 `/result/:castId`。

生产环境使用 HTML5 History 路由时，部署服务器必须把未匹配的前端路径回退到 `index.html`。现有通过 URL hash 注入测试序列的能力需要迁移到不会与路由冲突的测试入口。

### 3.2 登录回跳

AI 路由使用 `meta.requiresAuth`。进入受保护路由时：

1. 会话状态未知时请求当前 Session。
2. 已登录则继续导航。
3. 未登录则跳转到 `/login?redirect=<原站内路径>`。
4. 登录成功后使用 `router.replace()` 返回原路径；注册成功先跳转登录页并继续保留该路径。

`redirect` 只能接受站内路径，禁止跳转到完整外部 URL。

### 3.3 卦象定位

结果和 AI 页面始终操作明确的 `castId`。页面按以下顺序解析对应卦象：

1. 当前会话内存。
2. 匿名 localStorage 历史。
3. 已登录用户的服务端历史。
4. 全部找不到时展示“该卦象已不存在”，不得自动改用最新一卦。

## 4. 登录与注册

### 4.1 登录方式

第一版使用邮箱和密码登录。成功响应由后端设置 Session Cookie，前端只保存用户摘要和会话状态。

前端会话状态统一为：

```text
unknown | authenticated | anonymous
```

页面不得在状态为 `unknown` 时闪现“未登录”界面。

### 4.2 注册方式

注册流程为：

1. 输入邮箱。
2. 发送注册验证码。
3. 输入验证码。
4. 设置并确认密码。
5. 注册成功后保持匿名 Session，并跳转登录页。
6. 用户使用新账户登录后返回注册前的目标页面。

验证码按钮需要处理发送中、倒计时、可重发、失效和频率限制状态。

### 4.3 Cookie 与请求规则

- 前端不向 localStorage、sessionStorage 或普通 Cookie 写入鉴权 token。
- 真实登录和注册请求在 JSON 序列化前使用 Session 响应提供的服务端公钥封装密码；请求体不得出现明文 `password` 字段。
- 开发和生产环境优先让 API 与页面保持同源，统一使用 `/api` 前缀。
- HTTP 封装统一携带 Cookie 凭据，并归一化 401、403、429 和服务异常。
- 后端 Session Cookie 应使用 `HttpOnly`、`Secure` 和合适的 `SameSite`。
- 产生写操作的接口仍需配合后端 CSRF 策略，不能仅依赖 SameSite。
- 验证码、注册和登录按钮在匿名 Session 初始化完成前保持禁用；初始化依赖失败时状态保持 `unknown` 并允许后续显式操作重新初始化，不能误标为 `anonymous`。
- Session 读取与鉴权写操作使用独立超时。超时或 `CSRF_TOKEN_INVALID` 后重置为 `unknown`，下一次明确提交前重新取得 Session；注册超时提示必须说明结果可能已经生效并引导用户尝试登录确认。

## 5. 页面视觉与交互

### 5.1 登录与注册

登录和注册页面必须延续现有视觉语言：

- 深蓝黑星空背景、青色能量线、铜金色强调。
- 复用现有品牌顶栏、粒子、环境光晕和半透明深色面板。
- 继续使用现有中文正文字体、展示字体和小号英文状态文字。
- 输入框保持安静的深色表面，发光只用于焦点和主操作。
- 不引入暖色纸张、普通白色后台卡片或另一套无关配色。
- 移动端单列，输入和按钮触控高度不低于 44 CSS 像素。

登录页主标题建议使用“继续观象”，主按钮使用“登录并继续”；注册页主按钮使用“完成注册”。注册页说明成功后仍需登录，登录完成后才返回当前卦象。

### 5.2 AI 解卦入口

第一版不在历史抽屉每一行增加 AI 按钮。原因：

- 抽屉和移动端宽度有限。
- 当前整行已承担“查看结果”操作。
- 多操作会增加误触和视觉噪声。
- 用户应先确认卦象，再进入需要登录的 AI 功能。

结果页在本卦/变卦卡片之后、动爻说明和免责声明之前加入独立行动区：

```text
本卦 / 变卦结果
        ↓
“想就此卦继续问？” + “AI 解读此卦”
        ↓
动爻说明与文化体验提示
```

“AI 解读此卦”是该区域主操作，使用现有电光青视觉；“重新起卦”保持次操作。

### 5.3 AI 对话页

- 桌面端左侧为收窄的六爻和卦象上下文轨道，右侧为对话区。
- 移动端把卦象摘要折叠在对话顶部。
- 对话输入框固定在可见区域，但不得遮挡消息和系统提示。
- 卦辞等确定性信息展示为“本次对话依据”卡片，不伪装成 AI 自由生成的结论。
- 流式回复期间显示停止生成、重试和错误恢复状态。

## 6. 历史记录策略

### 6.1 数据模型

匿名历史记录至少保存：

```json
{
  "clientId": "uuid",
  "createdAt": 1787300000000,
  "original": {
    "number": 1,
    "name": "乾"
  },
  "transformed": null,
  "schemaVersion": 1
}
```

前端在摇卦完成时确定本卦和可选变卦，并将卦序与卦名作为需要同步的结果保存。没有变卦时使用 `transformed: null`。当前 `id` 字段在迁移时统一为稳定的 `clientId`，服务端以 `userId + clientId` 幂等去重。

### 6.2 各状态行为

| 状态 | 写入 | 展示 |
|---|---|---|
| 未登录 | localStorage，最多 10 条 | 当前浏览器匿名历史 |
| 已登录 | 本地即时写入，后台同步服务端 | 服务端结果为主，本地为缓存和待同步队列 |
| 登录后发现匿名历史 | 不自动上传全部 | 提示用户“合并本机历史” |
| 退出登录 | 清除账户专属本地缓存 | 保留尚未归属账户的匿名记录 |

匿名历史可能包含敏感意图，因此不能在登录后无提示地上传全部记录。用户确认合并后，批量上传；服务端确认成功后从匿名空间移除对应记录，避免退出登录后再次暴露或重复合并。

登录后，本机未合并记录仍需在历史抽屉中单独列出并可直接打开查看；合并只能是可选的跨设备同步操作，不能成为查看本机记录的前置条件。旧版非 UUID 本机标识在读取时稳定迁移为合法 UUID，避免同一条记录持续合并失败。

用户点击 AI 解读时不等待完整历史合并。创建对话请求可以原子地上传当前选中的一卦，其他匿名记录后续再处理。

## 7. AI 对话生命周期

1. 用户在结果页点击“AI 解读此卦”。
2. 前端进入 `/ai/:castId`，由路由守卫完成登录校验。
3. 页面解析指定卦象并调用创建或恢复对话接口。
4. 前端提交已经确定的本卦和可选变卦；后端仅校验卦序与卦名是否为六十四卦中的合法组合，不根据六爻重新计算或纠正结果。
5. 初始化成功后展示助手开场消息：“所问何事？”
6. 输入框解除禁用，用户可以提交具体问题。
7. 后续回复通过 SSE 渲染，前端使用 `fetch()` 读取响应流。

初始化过程中不能让用户向一个尚未建立的对话发送消息。初始化失败时禁用输入框，并提供“重新载入卦象”操作。

## 8. API 契约

### 8.1 通用响应

成功：

```json
{
  "data": {},
  "requestId": "req_xxx"
}
```

失败：

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "登录状态已失效",
    "fieldErrors": {}
  },
  "requestId": "req_xxx"
}
```

前端根据稳定的 `code` 处理业务分支，`message` 只用于合适的用户提示，不解析文本判断错误类型。

AI 相关稳定错误码包括 `AI_INPUT_TOO_LONG`、`AI_SCOPE_AMBIGUOUS`、`AI_SCOPE_REJECTED`、`AI_RATE_LIMITED`、`AI_DAILY_QUOTA_EXCEEDED`、`AI_TOKEN_QUOTA_EXCEEDED` 和 `AI_CONCURRENCY_LIMITED`。429 响应可以在 `error.retryAfter` 返回可重试等待秒数，前端据此展示剩余等待时间。

### 8.2 鉴权接口

#### 发送注册验证码

```http
POST /api/auth/verification-codes
```

```json
{
  "email": "user@example.com",
  "scene": "register"
}
```

```json
{
  "data": {
    "expiresIn": 600,
    "resendAfter": 60
  }
}
```

#### 注册账户（保持匿名 Session）

```http
POST /api/auth/register
```

```json
{
  "email": "user@example.com",
  "code": "123456",
  "passwordEnvelope": {
    "algorithm": "x25519-xsalsa20-poly1305-v1",
    "ephemeralPublicKey": "base64url",
    "nonce": "base64url",
    "ciphertext": "base64url"
  }
}
```

#### 登录

```http
POST /api/auth/login
```

```json
{
  "email": "user@example.com",
  "passwordEnvelope": {
    "algorithm": "x25519-xsalsa20-poly1305-v1",
    "ephemeralPublicKey": "base64url",
    "nonce": "base64url",
    "ciphertext": "base64url"
  }
}
```

注册成功返回 `{ "registered": true }`，不建立认证 Session。登录成功返回用户摘要并由响应头设置认证 Session Cookie：

```json
{
  "data": {
    "user": {
      "id": "usr_xxx",
      "email": "user@example.com"
    }
  }
}
```

#### 当前会话与退出

```http
GET  /api/auth/session
POST /api/auth/logout
```

### 8.3 卦象历史接口

```http
POST   /api/divinations
POST   /api/divinations/batch-upsert
GET    /api/divinations?cursor=xxx&limit=20
GET    /api/divinations/:id
DELETE /api/divinations/:id
```

单条写入：

```json
{
  "clientId": "uuid",
  "createdAt": "2026-08-21T10:00:00.000Z",
  "original": {
    "number": 1,
    "name": "乾"
  },
  "transformed": null,
  "schemaVersion": 1
}
```

服务端完全采用前端提交的摇卦结果，只校验 `original` 和 `transformed` 是否属于六十四卦中的合法“卦序 + 卦名”组合，不根据六爻重新计算、推断、替换或纠正卦象。批量接口使用同一记录结构，并逐条返回成功、重复或失败状态。

### 8.4 AI 对话接口

#### 创建或恢复对话

```http
POST /api/ai/conversations
```

```json
{
  "clientDivinationId": "uuid",
  "divination": {
    "createdAt": "2026-08-21T10:00:00.000Z",
    "original": {
      "number": 1,
      "name": "乾"
    },
    "transformed": null,
    "schemaVersion": 1
  }
}
```

```json
{
  "data": {
    "conversationId": "conv_xxx",
    "divinationId": "div_xxx",
    "openingMessage": {
      "id": "msg_xxx",
      "role": "assistant",
      "content": "所问何事？"
    },
    "oracleContext": {
      "original": {
        "number": 1,
        "name": "乾",
        "judgment": "元亨，利贞。"
      },
      "transformed": null
    }
  }
}
```

同一用户对同一个 `castId` 所代表的具体起卦记录重复初始化时，应幂等地恢复该记录已有的对话。不同 `castId` 表示不同起卦记录，即使本卦和变卦完全相同，也必须分别创建独立对话。前后端不得使用卦序、卦名、本卦、变卦或其组合作为对话去重依据。

#### 加载已有对话

```http
GET /api/ai/conversations/:conversationId
```

#### 发送消息

```http
POST /api/ai/conversations/:conversationId/messages
```

```json
{
  "clientMessageId": "uuid",
  "content": "我最近是否适合更换工作？"
}
```

回复采用 SSE。接口接收 `POST` JSON 请求，成功建立流后响应头至少包含：

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
```

SSE 事件至少包含：

```text
message.start
message.delta
message.done
error
```

事件使用标准 SSE 的 `event:` 与 `data:` 字段，并以空行分隔。前端使用 `fetch()` 而不是原生 `EventSource`，以便通过 `POST` 发送消息体。停止生成时调用 `POST /api/ai/conversations/:conversationId/messages/:clientMessageId/cancel`，并使用 `AbortController` 关闭本地流。`clientMessageId` 同时承担发送幂等和取消定位。

第一版免费使用限制由服务端强制执行：单用户最多 5 个新 AI 对话、40 条消息尝试、15 次主模型生成和 30,000 个模型计费 token/滚动 24 小时；单 IP 对应上限为 20 个对话、160 条消息尝试、60 次生成和 120,000 token。单条消息最多 800 个 Unicode 字符，单次输出最多 1,200 token，同一用户仅允许 1 个生成请求并发。前端可以展示限制说明和服务端返回的剩余额度，但不得在本地自行判定或替代服务端配额。

## 9. 前端代码边界

建议结构：

```text
src/
  api/
    http.js
    auth.js
    divinations.js
    conversations.js
  router/
    index.js
  composables/
    useSession.js
    useDivinationHistory.js
    useChatStream.js
  pages/
    DivinationPage.vue
    ResultPage.vue
    LoginPage.vue
    RegisterPage.vue
    AiConversationPage.vue
  components/
    AppShell.vue
    AuthPanel.vue
    HexagramSummary.vue
    ChatMessage.vue
```

- `http.js` 负责基础地址、Cookie、请求超时、响应解析和错误归一化。
- `auth.js` 负责验证码、注册、登录、Session 和退出。
- `divinations.js` 负责历史查询、单条保存和批量合并。
- `conversations.js` 负责对话初始化、消息加载和流式回复。
- 页面和普通组件不得直接散落 `fetch` 调用。
- `useChatStream.js` 负责解析 SSE 帧、分发 `message.start`、`message.delta`、`message.done` 和 `error` 事件，并通过 `AbortController` 停止生成。
- 现阶段不因这项功能强制引入大型状态库；会话、历史和聊天分别由小型 composable 管理。
- 无后端阶段由 Mock 适配器实现同一公开接口，真实后端接入时只替换适配器。
- 所有源代码使用 JavaScript。公共和可复用 API 的说明采用紧邻符号的 `/** ... */` JSDoc，按需使用 `@param`、`@returns`、`@throws` 和 `@typedef`。

## 10. 状态与异常

至少覆盖：

- Session 检查中、已登录、未登录、Session 过期。
- 验证码发送中、冷却中、失效、频率受限。
- 指定卦象不存在、损坏、版本不兼容。
- 历史同步中、部分成功、离线待同步、冲突去重。
- AI 初始化中、生成中、用户停止、网络中断、内容失败和重试。
- 在收到 `message.start` 前发生的 JSON、范围判断或连接失败只作为输入区错误展示：移除临时问题与 AI 加载消息，并把原问题放回输入框；流已经开始后的失败保留为对话终态。
- AI 输入过长、范围需要澄清、请求超出解卦范围、短时限流、24 小时次数或 token 用尽、并发占用以及对应的可重试时间。
- 登录过程中保留原始 `castId`，不得回跳到其他卦象。

401 统一使当前会话失效，并将受保护页面送回登录流程；普通业务错误不得被误判成退出登录。

范围判断应允许用户围绕当前卦象讨论工作、感情、家庭、人际、学业、健康焦虑和人生选择等广泛问题。只有当主要目标变成与当前卦象无关的通用问答、代码、翻译、长文代写、提示词套取或指令覆盖时，前端才展示服务端的范围提示；前端不得用关键词黑名单自行拦截。

## 11. 验收标准

### 路由与鉴权

- 未登录用户可完成现有全部公开流程。
- 未登录用户从任意结果点击 AI 后进入登录页。
- 注册成功后进入登录页；登录成功后返回同一个 `castId`。
- 已登录用户点击 AI 不经过登录页。
- 直接访问受保护 URL 同样触发鉴权。
- 非法外部 `redirect` 不执行跳转。

### 卦象上下文

- 从历史打开旧卦后，AI 收到的是该旧卦而不是 localStorage 第一条。
- 指定记录缺失时不回退到最新记录。
- 前端提交当前 `castId` 对应的本卦和可选变卦，后端不得复算或替换该结果。
- 本卦和变卦均以合法的卦序与卦名组合传输；没有变卦时提交 `transformed: null`。
- 同一个 `castId` 重复初始化时不会创建重复卦象记录或对话。
- 不同 `castId` 即使卦象结果相同，也会创建彼此独立的卦象记录和对话。

### 历史

- 匿名用户仍可看到最多 10 条本地历史。
- 登录不会自动上传全部匿名历史。
- 登录后无需合并也能查看本机历史，账户记录与本机未合并记录有明确分区。
- 用户确认后可批量合并并去重。
- 当前卦象可以独立于批量合并进入 AI 对话。
- 退出账户后不展示该账户的云端缓存。

### 视觉与可用性

- 登录、注册和 AI 页面与现有深空、铜金、电光青视觉一致。
- 375px 宽度下无页面级横向溢出。
- 键盘可完成登录、注册和对话提交。
- 加载、失败、禁用和焦点状态均清晰可读。
- AI 页面始终展示文化体验与高风险领域提示。

## 12. 推荐实施顺序

1. 引入路由并把现有结果变为可定位的 `/result/:castId`。
2. 建立 API 基础层、会话状态和 Mock 适配器。
3. 完成登录、注册和受保护路由回跳。
4. 在结果页加入 AI 入口，保证指定卦象传递正确。
5. 完成 AI 对话初始化、上下文卡和流式消息状态。
6. 将历史从当前 v1 结构迁移到带 `clientId` 和 `schemaVersion` 的新结构。
7. 完成登录后的历史合并与服务端分页。
8. 补齐路由、鉴权、历史、上下文选择和流式对话测试，再执行完整 CI。
