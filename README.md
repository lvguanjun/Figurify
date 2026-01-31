# Figurify 📸

学术论文图片拼接工具 - 为学术论文插图而生的专业拼接与处理工具。

## 技术栈

- **后端**: FastAPI (Python 3.10+)
- **前端**: 原生 JavaScript (ES6+) + Bootstrap 5 + Fabric.js (Canvas 处理)
- **API 风格**: 纯 RPC 风格 (动词接口, POST 请求)
- **部署**: Docker Compose

## 核心功能

- 📁 **图片管理**: 批量上传、删除、拖拽排序。
- ✏️ **专业编辑**: 基于 Fabric.js 的 Canvas 编辑器，支持画笔、形状遮罩、撤销/重做。
- 🎨 **学术拼接**: 自定义每行图片数、高度、间距、背景色。
- 🏷️ **智能标签**: 支持数字 (1, 2)、字母 (a, b)、罗马数字 (i, ii) 及括号样式。
- ⬇️ **高清导出**: 生成 300 DPI 的学术级插图。

## 快速开始

### 1. 开发环境启动

```bash
# 安装依赖
pip install -r requirements.txt

# 启动应用
uvicorn app.main:app --reload
```

### 2. 访问应用
打开浏览器访问 `http://localhost:8000`

## 目录结构

```text
Figurify/
├── app/                # 后端核心逻辑 (API, Services, Utils)
├── static/             # 前端静态资源 (HTML, JS, CSS)
├── requirements.txt    # 项目依赖
└── CLAUDE.md           # 开发指南
```
