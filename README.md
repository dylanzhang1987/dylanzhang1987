# Painting Class Backend

## 课程管理系统后端 API

基于 Koa.js + MySQL 构建的课程管理系统后端服务。

## 技术栈

- **框架**: Koa.js 2.x
- **数据库**: MySQL
- **认证**: JWT (JSON Web Token)
- **其他**: bcryptjs, koa-router, koa-bodyparser, koa-cors

## 目录结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── middlewares/     # 中间件 (auth, role, audit, access)
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── services/        # 业务服务 (import, statistics)
│   ├── utils/           # 工具函数
│   └── app.js           # 应用入口
├── uploads/             # 文件上传目录
├── .env.example         # 环境变量示例
└── package.json
```

## 安装

```bash
npm install
```

## 配置

复制 `.env.example` 为 `.env` 并配置数据库连接：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=painting_class
JWT_SECRET=your_jwt_secret
```

## 运行

```bash
# 开发模式 (使用 nodemon 自动重启)
npm run dev

# 生产模式
npm start
```

## API 端点

### 认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户管理 (仅超管)
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 学生管理
- `GET /api/students` - 获取学生列表
- `POST /api/students` - 创建学生
- `PUT /api/students/:id` - 更新学生
- `DELETE /api/students/:id` - 删除学生
- `POST /api/students/import` - 导入学生 (Excel/CSV)

### 课程管理
- `GET /api/courses` - 获取课程列表
- `POST /api/courses` - 创建课程
- `PUT /api/courses/:id` - 更新课程
- `DELETE /api/courses/:id` - 删除课程

### 考勤管理
- `GET /api/attendance` - 获取考勤记录
- `POST /api/attendance` - 记录考勤
- `PUT /api/attendance/:id` - 更新考勤

### 统计
- `GET /api/statistics/overview` - 获取概览统计

### 审计日志 (仅超管)
- `GET /api/audit-logs` - 获取审计日志

## 默认账号

- **超管**: admin / admin123

## License

ISC
