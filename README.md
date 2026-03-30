# TurnIn

班级作业收集与审核系统，基于 `Next.js 16 + Prisma + MySQL + Zustand + Tailwind CSS`。

## 已实现功能

### 学生端

- 选择班级和学生身份进入提交通道
- 查看班级下的全部作业、截止时间、命名规则
- 按作业配置动态生成附加字段表单
- 上传附件并提交备注
- 查看审核状态、审核意见，并在被退回后重新提交
- 自动记住最近一次选择的班级和学生

### 管理端

- 管理员登录
- 统计面板：班级、学生、作业、提交总览
- 班级管理：新增、编辑、删除、单个添加学生、批量导入学生
- 班级详情：查看学生列表、班级作业进度、提交完成情况
- 作业管理：新增、编辑、删除作业，关联班级，配置附加字段
- 提交列表：按班级、作业、状态筛选，查看附件，审核通过或退回修改

### 系统能力

- 服务端 Cookie 鉴权，`/admin` 页面和管理 API 在服务端拦截
- 文件上传到 `public/uploads/submissions`
- 删除学生、作业、班级时自动清理对应附件
- 登录兼容明文密码和 `bcrypt` 哈希密码

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境模板：

```bash
cp .env.example .env
```

至少配置：

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/turnin"
JWT_SECRET="change-this-secret"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="ChangeMe123!"
```

### 3. 执行数据库迁移

开发环境：

```bash
npx prisma migrate dev
```

部署环境：

```bash
npm run db:migrate
```

### 4. 生成 Prisma Client

```bash
npm run db:generate
```

### 5. 初始化管理员账号

```bash
npm run db:init-admin
```

如果账号已存在，会直接重置为当前环境变量中的密码。

### 6. 启动项目

```bash
npm run dev
```

访问：

- 学生端：`http://localhost:3000`
- 管理端：`http://localhost:3000/admin`
- 登录页：`http://localhost:3000/login`

## 常用命令

```bash
npm run dev
npm run build
npx tsc --noEmit
npm run db:generate
npm run db:migrate
npm run db:init-admin
```

## 目录说明

- `src/app/(page)`：页面路由
- `src/app/api`：接口路由
- `src/components`：界面组件
- `src/lib`：认证、API、上传、提交规则等基础能力
- `prisma/schema.prisma`：数据模型
- `prisma/migrations`：数据库迁移
- `scripts/init-admin.ts`：管理员初始化脚本

## 当前注意事项

- 新增了两次迁移，拉取代码后必须执行数据库迁移，否则审核字段和长文本字段不会生效。
- 上传文件保存在 `public/uploads/submissions`，生产环境建议挂载持久化存储。
- 现在仍然是“公开学生入口 + 管理员后台”模式，没有单独的学生登录系统。
