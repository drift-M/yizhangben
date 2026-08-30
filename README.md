# 衣账本 - 服装店记账本

一款面向服装店的轻量级记账与库存管理 Web 应用，支持商品管理、销售记账、财务报表、数据备份以及跨设备云端同步。

## 功能特性

### 用户管理
- 账号注册与登录，密码长度校验
- 本地模式下密码使用 SHA-256 哈希存储
- 支持"记住我"与安全退出
- 密码找回/重置流程（云端模式通过邮件）

### 商品管理
- 添加/编辑/删除商品（型号、名称、图片、多尺码库存、分类、进价、售价）
- 同一型号商品支持多个尺码，各尺码独立管理库存
- 删除操作二次确认
- 按名称、型号、尺码搜索，按分类筛选
- 库存为 0 时自动高亮预警

### 销售与财务
- 快速记录销售，按尺码精确扣减库存并计算利润
- 删除销售记录时自动回滚对应尺码库存
- 实时展示今日销售额、成本、利润、订单数
- 支持按日、周、月及自定义时间范围查看报表
- 销售趋势图与商品销量排行

### 分类管理
- 商品分类管理

### 数据安全与备份
- 默认使用 Supabase 云端数据库，支持多设备、多地区同步访问
- 可显式开启本地 IndexedDB 演示模式（单机离线体验）
- 支持一键导出/导入 JSON 备份
- 可开启本地自动备份缓存

## 技术栈

- **前端框架**：React 18 + TypeScript 5
- **构建工具**：Vite 6
- **状态管理**：Zustand
- **路由**：React Router v6
- **样式**：Tailwind CSS 3
- **图表**：Recharts
- **表单校验**：Zod
- **本地数据库**：Dexie.js（IndexedDB，仅演示模式）
- **云服务**：Supabase（Auth + PostgreSQL，默认）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

项目默认使用 Supabase 云端模式。复制 `.env.example` 为 `.env.local` 并填入你的 Supabase 信息：

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

若只想在本地离线体验，可设置：

```env
VITE_USE_LOCAL_MODE=true
```

### 3. 本地开发

```bash
npm run dev
```

默认访问 http://localhost:5173。

### 4. 生产构建

```bash
npm run build
```

构建产物位于 `dist/` 目录，可直接部署到任意静态托管服务。

## 部署说明

本项目默认使用 Supabase 云端模式，部署前必须完成 Supabase 配置。

### Supabase 云端模式（默认）

1. 在 [Supabase](https://supabase.com) 创建项目。
2. 在 SQL Editor 中执行以下建表语句（建议开启 RLS，仅允许用户访问自己的数据）：

```sql
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  name text not null,
  created_at timestamp with time zone default now()
);

create table products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  category_id uuid references categories(id),
  name text not null,
  model text not null,
  image text not null default '',
  sizes jsonb not null default '[]'::jsonb,
  cost_price numeric not null,
  sale_price numeric not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table sales (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  product_id uuid not null references products(id),
  created_by uuid not null,
  quantity integer not null,
  unit_price numeric not null,
  cost_price numeric not null,
  profit numeric not null,
  sold_at timestamp with time zone default now(),
  sold_size text not null default ''
);

create table settings (
  user_id uuid primary key,
  auto_backup boolean not null default false
);
```

3. 为每张表开启 RLS 并添加策略，确保用户只能访问自己的数据：

```sql
alter table categories enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table settings enable row level security;

create policy "允许用户访问自己的分类" on categories for all using (auth.uid() = user_id);
create policy "允许用户访问自己的商品" on products for all using (auth.uid() = user_id);
create policy "允许用户访问自己的销售记录" on sales for all using (auth.uid() = user_id);
create policy "允许用户访问自己的设置" on settings for all using (auth.uid() = user_id);
```

4. 在项目根目录创建 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. 执行 `npm run build` 并部署 `dist/` 到任意静态托管服务。

### 纯本地模式（仅演示）

如需离线体验，可在 `.env.local` 中设置：

```env
VITE_USE_LOCAL_MODE=true
```

此时数据保存在浏览器 IndexedDB 中，适合单机试用，不建议用于多设备生产环境。

## 使用说明

1. 首次打开应用，点击"立即注册"创建账号。
2. 进入首页后，可查看今日营收概览与库存预警。
3. 在"商品"页面添加服装商品，填写型号、名称、图片、尺码、数量、价格。
4. 在"销售"页面选择商品、尺码并记录每一笔销售。
5. 在"报表"页面查看营收趋势与销量排行。
6. 在"设置"页面导出/导入备份。

## 项目脚本

```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run check    # TypeScript 类型检查
npm run lint     # ESLint 代码检查
npm run preview  # 预览生产构建
```

## 注意事项

- 生产环境请务必使用 Supabase 云端模式，本地模式仅适合单机演示。
- 本地模式下数据仅保存在本机浏览器中，换设备或清空浏览器数据后需重新创建。
- 重要数据请定期通过"设置"页面导出备份。
- 云端模式下，已在 Supabase 中配置 RLS 策略以确保数据隔离，请勿关闭 RLS。
