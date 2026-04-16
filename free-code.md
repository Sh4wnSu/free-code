# free-code

free-code 是 Anthropic **Claude Code** CLI 的一个独立 fork 版本（v2.1.87）。上游源码于 2026 年 3 月 31 日通过 npm 分发包中的 source map 曝光后被公开。本 fork 在此基础上做了三类修改：

1. **移除遥测（Telemetry）** — 所有对外遥测通道（OpenTelemetry/gRPC、GrowthBook 上报、Sentry、自定义事件日志）均被消除或 stub 为空操作。
2. **移除安全提示护栏（Security Prompt Guardrails）** — 去除了 Anthropic 注入的硬编码拒绝模式、"cyber risk" 指令块和 managed-settings 安全覆盖层。
3. **解锁实验性功能** — 在审计的 88 个 feature flag 中，45+ 个能通过编译的 flag 已全部启用。

项目独立发布自 [paoloanzn/free-code](https://github.com/paoloanzn/free-code)，镜像于 [win4r/free-code](https://github.com/win4r/free-code)，并有 IPFS 永久镜像（CID: `bafybeiegvef3dt24n2znnnmzcud2vxat7y7rl5ikz7y7yoglxappim54bm`）。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| **Bun** (>= 1.3.11) | JavaScript/TypeScript 运行时与打包器 |
| **TypeScript** | 主要开发语言（ESNext target） |
| **React 19** + **Ink 6** | 终端 UI 渲染（在终端中运行 React 组件） |
| **Commander.js** | CLI 参数解析 |
| **Zod v4** | Schema 校验 |
| **Anthropic SDK** | Claude 模型 API 客户端 |
| **MCP SDK** | Model Context Protocol 服务端/客户端 |
| **LSP** | Language Server Protocol 集成 |
| **sharp** | 图片处理 |
| **chokidar** | 文件监听 |
| **marked** | Markdown 渲染 |
| **diff** | Diff 计算 |
| **ws** | WebSocket 支持 |

---

## 项目结构

```
free-code/
├── cli                      # 预构建生产二进制 (~219 MB)
├── cli-dev                  # 预构建开发二进制 (~222 MB，含全部实验特性)
├── install.sh               # 一键安装脚本
├── package.json             # Bun workspace 配置
├── tsconfig.json            # TypeScript 配置
├── env.d.ts                 # 构建时 MACRO 常量类型声明
├── bun.lock                 # 依赖锁文件
├── scripts/
│   └── build.ts             # 构建脚本（含 feature flag 系统）
├── src/
│   ├── entrypoints/         # 入口点：CLI (cli.tsx)、MCP Server (mcp.ts)、初始化 (init.ts)
│   ├── main.tsx             # 核心 REPL 启动器（785KB，应用核心）
│   ├── commands/            # ~80+ 斜杠命令实现（/compact, /review, /login, /memory 等）
│   ├── tools/               # ~40+ Agent 工具实现（Bash、FileRead、FileEdit、Glob、Grep 等）
│   ├── components/          # Ink/React 终端 UI 组件
│   ├── screens/             # 主 REPL 界面
│   ├── services/            # 服务层：API 客户端、MCP、OAuth、LSP、压缩、插件等
│   ├── hooks/               # React Hooks（工具权限、通知）
│   ├── state/               # 应用状态管理
│   ├── utils/               # 工具函数（git、shell、权限、代理、配置等）
│   ├── skills/              # Skill 系统与 MCP Skill 构建器
│   ├── plugins/             # 插件系统
│   ├── bridge/              # IDE 远程控制桥接（VS Code、JetBrains）
│   ├── voice/               # 语音输入/听写
│   ├── tasks/               # 后台任务管理
│   ├── keybindings/         # 按键绑定系统
│   ├── vim/                 # Vim 模式
│   ├── memdir/              # 记忆目录系统
│   ├── migrations/          # 数据迁移
│   ├── constants/           # 应用常量
│   ├── context/             # React Context Providers
│   ├── ink/                 # Ink 渲染层
│   ├── query/               # 查询引擎
│   ├── schemas/             # JSON Schema
│   └── upstreamproxy/       # 上游代理中继
└── assets/                  # 截图等资源
```

源码总计约 **1,928 个 TypeScript/TSX 文件**。

---

## 核心架构

```
cli.tsx (入口)
  └─→ main.tsx (核心初始化与 REPL 启动)
        ├─→ init.ts (配置、网络、OAuth、清理)
        ├─→ QueryEngine (通过 Anthropic API 进行 LLM 交互)
        ├─→ Tools (Bash, FileRead, FileEdit, Glob, Grep, WebFetch, MCP, Agent 等)
        ├─→ Commands (/compact, /review, /memory 等斜杠命令)
        ├─→ Skills & Plugins (可扩展性)
        └─→ Bridge (IDE 集成：VS Code, JetBrains)
```

1. `cli.tsx` 处理快速路径标志（`--version`、子命令），最小化导入
2. 正常运行时导入 `main.tsx` 编排完整应用
3. `init.ts` 初始化配置、网络（mTLS、代理）、OAuth 和清理工作
4. 核心 REPL 是一个 Ink/React 应用，渲染终端 UI 组件
5. QueryEngine 通过 Anthropic API 处理 LLM 交互
6. 工具系统（Bash、文件读写、搜索、Web 抓取、MCP 等）在 `tools.ts` 中注册并执行操作
7. Skill 和 Plugin 系统提供可扩展性
8. Feature flags 使用 `bun:bundle` 编译时 `feature()` 控制实验功能的死代码消除

---

## 构建与运行

### 环境要求

- Bun >= 1.3.11
- macOS 或 Linux（Windows 通过 WSL）
- Anthropic API Key

### 构建命令

| 命令 | 输出 | 说明 |
|---|---|---|
| `bun run build` | `./cli` | 生产二进制，仅 `VOICE_MODE` |
| `bun run build:dev` | `./cli-dev` | 开发二进制，仅 `VOICE_MODE` |
| `bun run build:dev:full` | `./cli-dev` | 开发二进制，含全部 35+ 实验特性 |
| `bun run compile` | `./dist/cli` | 输出到 `dist/` |
| `bun run dev` | — | 从源码直接运行（较慢） |

### 单独启用特性

```bash
bun run ./scripts/build.ts --feature=ULTRAPLAN --feature=ULTRATHINK
```

### 运行

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
./cli                                          # 交互式 REPL
./cli -p "what files are here?"                # 单次模式
./cli --model claude-sonnet-4-6-20250514       # 指定模型
./cli /login                                   # Claude.ai OAuth 登录
```

### 一键安装

```bash
curl -fsSL https://raw.githubusercontent.com/win4r/free-code/main/install.sh | bash
```

---

## Feature Flags

项目包含 **88 个 feature flag** 的完整审计（详见 `FEATURES.md`）：

- **54 个** flag 可正常打包（34 个打包失败）
- **35 个**实验特性可正常工作（UI/Agent/Tools 分类）
- **16 个**打包安全的支持 flag（底层/遥测开关）
- **6 个**编译安全但运行时有注意事项的 flag
- **3 个**因缺少大型子系统而无法启用（`KAIROS`、`KAIROS_DREAM`、`PROACTIVE`）

Feature flag 机制基于 `bun:bundle` 的编译时特性检查，启用的 flag 会内联为 `true`，未启用的则被死代码消除。

---

## 文档

- `README.md` — 项目主文档（安装、构建、运行说明）
- `FEATURES.md` — 88 个 feature flag 的详细审计报告
- `free-code.md` — 本文件，工程说明文档
