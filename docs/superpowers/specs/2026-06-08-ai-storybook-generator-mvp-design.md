# AI 故事绘本生成器 - MVP 设计文档

## 概述

AI 故事绘本生成器：用户输入故事梗概 + 风格 + 角色设定，AI 自动生成一本图文并茂的电子绘本，支持在线阅读。

## 核心数据模型

```typescript
interface Story {
  id: string;
  title: string;
  style: 'watercolor' | 'cartoon' | 'cutout' | 'pixel';
  ageRange: '3-5' | '5-7' | '7-10';
  characters: Character[];
  pages: Page[];
  createdAt: string; // ISO date
}

interface Character {
  name: string;
  description: string;
  visualClues: string; // 外观特征的文字描述，用于保持形象一致
}

interface Page {
  pageNumber: number;
  text: string;           // 该页文字（1-2句）
  imagePrompt: string;    // 英文配图提示词，传给图像 API
  imageUrl: string;       // 生成的图片 URL 或 base64
}
```

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 样式 | Tailwind CSS |
| 文本 AI | Claude API (@anthropic-ai/sdk) |
| 图像 AI | Replicate (Stable Diffusion) 或 OpenAI DALL-E 3 |
| 存储 | 文件系统 (JSON 文件) |
| PDF 导出 | 延后（MVP 不包含） |

## 项目目录结构

```
ai-storybook-generator/
├── app/
│   ├── page.tsx              # 首页 - 已有故事列表
│   ├── create/page.tsx       # 创作页 - 表单
│   └── stories/[id]/page.tsx # 阅读页 - 翻页阅读器
├── app/api/
│   └── stories/generate/route.ts  # POST - 生成故事
├── lib/
│   ├── story-store.ts        # 本地 JSON 读写
│   └── ai.ts                 # Claude + 图像 API 调用封装
├── types.ts                  # TypeScript 类型定义
└── .stories/                 # 故事 JSON 文件存储目录（gitignored）
```

## 前端页面

### 首页 `/`
- 展示已生成的故事列表（封面缩略图 + 标题 + 风格标签）
- "创作新故事" 按钮 → 跳转到 `/create`

### 创作页 `/create`
- **故事梗概**：textarea 输入框
- **风格选择**：4 种风格卡片（水彩/卡通/剪纸/像素），点击选择
- **角色设定**：可添加 1-3 个角色，每个角色填写名称 + 外观描述
- **年龄段**：下拉选择（3-5 / 5-7 / 7-10）
- **生成按钮**：点击后显示进度状态

### 阅读页 `/stories/[id]`
- 翻页式阅读器（左右箭头 / 点击翻页）
- 每页展示：大图（约 60%）+ 下方文字
- 底部操作：当前页/总页数指示器
- 重新生成单页插图的功能入口

## AI 生成流程

### 文本生成（Claude API）
一次 API 调用完成全部故事编写：
- **System Prompt**：设定为儿童绘本作家角色，要求输出 6-8 页故事
- **User Prompt 包含**：故事梗概、风格、角色设定、年龄段
- **输出格式**：JSON，包含标题 + 每页的文本和配图提示词

### 图像生成（Replicate / DALL-E）
- 拿到所有页的 imagePrompt 后并行请求图像 API
- 每张图的 prompt 自动注入风格前缀（如 "watercolor style, soft pastel colors..."）
- 全部图片生成完成后保存故事
- 失败的页可单独重试

## 状态与进度

创作过程中的状态反馈：
1. "正在构思故事..."（Claude 调用中）
2. "正在绘制第 3/8 页插图..."（图像生成中，逐页更新进度）
3. 生成完成 → 自动跳转到阅读页

## API 设计

### POST /api/stories/generate

**Request:**
```json
{
  "outline": "一只想学飞行的小企鹅...",
  "style": "watercolor",
  "characters": [
    { "name": "Pingu", "description": "小企鹅", "visualClues": "黄色嘴巴，蓝色围巾" }
  ],
  "ageRange": "3-5"
}
```

**Response:**
```json
{
  "story": {
    "id": "xxx",
    "title": "会飞的小企鹅",
    "pages": [
      { "pageNumber": 1, "text": "...", "imagePrompt": "...", "imageUrl": "..." }
    ]
  }
}
```

## 限制与边界（MVP）

- 本地 JSON 文件存储，不支持多用户/账号
- 每本故事固定 6-8 页
- 不支持修改已生成的故事文本
- PDF 导出版本一延后实现
- 无用户认证
- API key 通过环境变量配置（`ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`）