# 赛博八卦

一个纯前端 Vue 3 单页面六爻铜钱起卦体验应用：通过三枚虚拟方孔铜钱连续投掷六次，生成本卦、变卦、卦象和卦辞。

## Quick start

```text
npm run harness:doctor
npm run harness:check
npm test
npm run ci
```

开发预览：

```text
npm run dev
```

应用流程：欢迎页 → 六次起卦 → 本卦/变卦结果。卦象数据与计算规则位于 `src/data/` 和 `src/utils/`，产品需求与校验记录位于 `docs/product-requirements.md`。

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
