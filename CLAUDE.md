# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 开发命令

**包管理器**: pnpm（必需 - 在 package.json 中配置）

```bash
# 开发
pnpm dev              # 启动开发服务器，包含运行时配置生成
pnpm build            # 生产构建，包含运行时配置生成
pnpm start            # 启动生产服务器

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 修复 + 格式化
pnpm lint:strict      # ESLint 零警告模式
pnpm typecheck        # TypeScript 类型检查
pnpm format           # Prettier 格式化
pnpm format:check     # 检查格式

# 测试
pnpm test             # Jest 测试
pnpm test:watch       # Jest 监视模式

# 构建工具
pnpm gen:runtime      # 从 config.json 生成运行时配置
pnpm gen:manifest     # 生成 PWA 清单文件
```

## 架构概览

**MoonTV** 是基于 Next.js 14 App Router 构建的视频流媒体聚合器，专为多源内容发现和播放而设计。

### 核心架构

**前端**: Next.js 14 + TypeScript + Tailwind CSS

- App Router 支持服务端/客户端组件
- PWA 支持，包含离线缓存
- 基于 next-themes 的深色/浅色主题
- 响应式设计（桌面侧边栏 + 移动底部导航）

**视频播放**: 双播放器系统

- 主要: 基于 HLS.js 的 Vidstack 播放器
- 备用: ArtPlayer 提供兼容性
- HLS 流媒体支持，包含广告跳过功能

**数据流**:

1. **配置系统**: `config.json` → 运行时生成 → 客户端注入
2. **身份验证**: 基于中间件，支持多种存储后端
3. **搜索**: 多源 API 聚合，包含超时/错误处理
4. **存储**: 可插拔后端（localStorage/Redis/Upstash）

### 关键目录

```text
src/
├── app/                 # Next.js App Router 页面 + API 路由
│   ├── api/            # REST 端点 (/search, /detail, /admin 等)
│   └── (pages)/        # UI 页面 (login, play, admin 等)
├── components/         # 可复用 React 组件
├── lib/                # 核心业务逻辑
│   ├── config.ts       # 配置管理
│   ├── db*.ts         # 存储抽象层
│   ├── auth.ts        # 身份验证工具
│   └── downstream.ts  # 多源 API 客户端
└── middleware.ts       # 身份验证 + 路由中间件
```

### 配置系统

**静态配置**: `config.json`（API 源、分类、缓存设置）
**运行时配置**: 生成并注入到 `window.RUNTIME_CONFIG`
**管理员配置**: 数据库存储的设置（非 localStorage 部署）
**环境变量**: 存储类型、代理设置、功能标志

配置流程:

- Docker: 动态读取 `config.json`
- 其他: 通过 `scripts/convert-config.js` 编译时生成
- 管理员设置会覆盖支持存储后端的文件配置

### 存储架构

**多后端支持**:

- `localstorage`: 仅客户端，基于密码的身份验证
- `redis`: 服务器 Redis 实例，用户账户 + 会话管理
- `upstash`: 无服务器 Redis，功能同 redis 模式

**数据类型**:

- 播放记录（进度、剧集跟踪）
- 收藏（书签内容）
- 搜索历史
- 管理员配置（源、分类、用户管理）
- 跳过配置（片头片尾跳过）

**实现**: 抽象 `IStorage` 接口，具体实现在 `redis.db.ts` 和 `upstash.db.ts`

### API 架构

**搜索流程**:

1. `/api/search` 并发聚合多个源 API
2. 每个源 20 秒超时，优雅降级
3. 内容过滤（成人内容），除非禁用
4. CDN 缓存，可配置 TTL

**源集成**:

- 支持苹果 CMS V10 API 格式
- 可通过 `config.json` 或管理面板配置
- 动态启用/禁用源
- 对无完整 API 的源提供自定义详情页抓取

### 身份验证与安全

**多模式身份验证**:

- `localstorage`: 客户端存储模式
- `redis`: 服务器 Redis 实例，用户账户管理
- `upstash`: 无服务器 Redis，用户会话管理

**管理员系统**:

- 管理员角色分配
- `/admin` 用户管理界面
- 通过数据库进行配置更改（仅非 localStorage 模式）

### 开发注意事项

**构建流程**:

1. 运行时配置生成（`gen:runtime`）
2. PWA 清单生成（`gen:manifest`）
3. Next.js 构建，包含静态优化

**Edge 运行时**: 搜索 API 使用 edge 运行时提升性能

**测试**: Jest + Testing Library 设置，支持模拟

**部署支持**:

- Docker（动态配置）
- Vercel/Netlify（静态配置）
- 每个平台支持多种存储后端配置
