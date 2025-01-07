以下是项目的README文档:

# 网站导航管理系统

## 项目简介
这是一个简单但功能完整的网站导航管理系统，允许用户添加、编辑、删除和组织他们的收藏网站。

## 主要功能
- ✨ 添加/编辑/删除网站
- 📂 创建和管理网站分组
- 🔄 拖拽排序分组
- 📝 编辑网站标题和描述
- 💡 悬浮提示显示网站详情
- 📱 响应式布局设计

## 技术栈
- 前端: HTML5, CSS3, JavaScript
- 后端: Node.js, Express
- 数据存储: JSON文件
- 跨域支持: CORS

## 安装和运行

### 环境要求
- Node.js (建议版本 >= 12.0.0)
- npm (Node.js包管理器)

### 安装步骤
1. 克隆项目到本地
2. 安装依赖:
```bash
npm init -y
npm install express cors
```

### 项目结构
```
项目目录/
  ├── public/
  │   ├── index.html    # 主页面
  │   ├── style.css     # 样式文件
  │   └── script.js     # 前端脚本
  ├── server.js         # 后端服务器
  ├── sites.json        # 数据存储文件
  └── package.json      # 项目配置文件
```

### 运行项目
1. 启动服务器:
```bash
node server.js
```
2. 在浏览器中访问:
```
http://localhost:3000
```

## 使用说明
- 点击右下角的"+"按钮添加新网站
- 点击"G+"按钮创建新分组
- 右键点击网站可以编辑或删除
- 右键点击分组标题可以编辑分组
- 拖拽分组可以调整顺序
- 右键点击页面标题可以修改导航标题

## API接口
- GET `/api/sites` - 获取所有网站数据
- POST `/api/sites` - 保存网站数据

## 贡献指南
欢迎提交问题和改进建议！

## 许可证
ISC License

## 作者
[作者名称]

---

希望这个README文档对你有帮助！如果需要任何补充或修改，请随时告诉我。

