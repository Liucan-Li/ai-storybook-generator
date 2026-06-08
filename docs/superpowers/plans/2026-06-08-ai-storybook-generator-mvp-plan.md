# AI 故事绘本生成器 - MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 MVP 核心链路：用户输入梗概 → AI 生成故事 + 插图 → 在线阅读翻页绘本

**Architecture:** Next.js 14 (App Router) 全栈应用，前端表单收集输入，API Route 调用 Agnes 2.0 Flash 生成故事文本和配图提示词，再通过 Agnes Image 2.1 Flash 并行生成插图，结果以 JSON 文件存于本地，阅读页渲染为翻页式绘本。

**Tech Stack:** Next.js 16, Tailwind CSS v4, Agnes AI API, 文件系统存储

---

## 文件结构总览

```
ai-storybook-generator/
├── app/
│   ├── page.tsx                    # 首页 - 故事列表
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式
│   ├── create/
│   │   └── page.tsx                # 创作页 - 表单
│   └── stories/
│       └── [id]/
│           └── page.tsx            # 阅读页 - 翻页阅读器
├── app/api/
│   └── stories/
│       └── generate/
│           └── route.ts            # POST 生成接口
├── lib/
│   ├── story-store.ts              # 本地 JSON 文件读写
│   └── ai.ts                       # Claude + Replicate 调用封装
├── types.ts                        # 核心 TypeScript 类型
├── .env.local                      # API keys（不提交）
└── .stories/                       # 故事数据目录（gitignored）
```

---

### Task 1: 项目脚手架

**Files:**
- Create: 整个 Next.js 项目
- Create: `.env.local`
- Create: `.gitignore` 追加规则

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd /Users/shmililiucan/claude-workspace/earn-money/ai-projects/ai-storybook-generator
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

选择: No for `use `useRouter`?`, default for others.

- [ ] **Step 2: 安装依赖**

```bash
npm install @anthropic-ai/sdk replicate uuid
npm install -D @types/uuid
```

- [ ] **Step 3: 创建 .env.local**

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

- [ ] **Step 4: 更新 .gitignore**

在 `.gitignore` 中追加：

```
.stories/
```

- [ ] **Step 5: 创建目录结构**

```bash
mkdir -p .stories app/create app/stories/\[id\] app/api/stories/generate lib
```

- [ ] **Step 6: 清空 globals.css 保留 Tailwind 指令**

确保 `app/globals.css` 只保留：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: 提交**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with Tailwind and dependencies"
```

---

### Task 2: 核心类型定义

**Files:**
- Create: `types.ts`

- [ ] **Step 1: 写入类型定义**

`types.ts`:

```typescript
export type StoryStyle = 'watercolor' | 'cartoon' | 'cutout' | 'pixel';
export type AgeRange = '3-5' | '5-7' | '7-10';

export interface Character {
  name: string;
  description: string;
  visualClues: string;
}

export interface Page {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl: string | null;     // null until image generation completes
}

export interface Story {
  id: string;
  title: string;
  style: StoryStyle;
  ageRange: AgeRange;
  characters: Character[];
  pages: Page[];
  createdAt: string;
}

export interface GenerateRequest {
  outline: string;
  style: StoryStyle;
  characters: Character[];
  ageRange: AgeRange;
}
```

- [ ] **Step 2: 提交**

```bash
git add types.ts
git commit -m "feat: add core TypeScript types"
```

---

### Task 3: 故事本地存储

**Files:**
- Create: `lib/story-store.ts`

- [ ] **Step 1: 实现 story-store**

`lib/story-store.ts`:

```typescript
import { Story } from '@/types';
import fs from 'fs';
import path from 'path';

const STORIES_DIR = path.join(process.cwd(), '.stories');

function ensureDir() {
  if (!fs.existsSync(STORIES_DIR)) {
    fs.mkdirSync(STORIES_DIR, { recursive: true });
  }
}

export function saveStory(story: Story): void {
  ensureDir();
  const filePath = path.join(STORIES_DIR, `${story.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(story, null, 2), 'utf-8');
}

export function getStory(id: string): Story | null {
  const filePath = path.join(STORIES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Story;
}

export function listStories(): Story[] {
  ensureDir();
  const files = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.json'));
  return files
    .map(f => getStory(f.replace('.json', '')))
    .filter((s): s is Story => s !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
```

- [ ] **Step 2: 提交**

```bash
git add lib/story-store.ts
git commit -m "feat: add local JSON story storage"
```

---

### Task 4: AI 服务（Claude + Replicate）

**Files:**
- Create: `lib/ai.ts`

- [ ] **Step 1: 实现 AI 服务**

`lib/ai.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { StoryStyle, Page } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

const STYLE_MAP: Record<StoryStyle, string> = {
  watercolor: 'watercolor illustration style, soft pastel colors, gentle brush strokes',
  cartoon: 'colorful cartoon illustration style, bold outlines, vibrant colors',
  cutout: 'paper cutout craft style, layered paper textures, folk art',
  pixel: 'retro pixel art style, 16-bit game graphics, chunky pixels',
};

const PAGE_COUNT = 7; // 6-8 pages, fixed at 7 for simplicity

interface ClaudeResponse {
  title: string;
  pages: { text: string; imagePrompt: string }[];
}

export async function generateStoryOutline(
  outline: string,
  style: StoryStyle,
  characters: { name: string; description: string; visualClues: string }[],
  ageRange: string
): Promise<ClaudeResponse> {
  const charDesc = characters
    .map(c => `- ${c.name}（${c.description}）：${c.visualClues}`)
    .join('\n');

  const prompt = `你是一位儿童绘本作家。请根据以下信息创作一个${PAGE_COUNT}页的绘本故事。

故事梗概：${outline}
绘画风格：${style}
角色设定：
${charDesc}
目标年龄：${ageRange}岁

要求：
- 故事分${PAGE_COUNT}页，每页1-2句简短文字（中文）
- 语言生动、适合该年龄段儿童
- 为每一页提供一个英文的AI图像生成提示词（imagePrompt），描述该页插图内容，包含角色形象和场景
- imagePrompt 以英文撰写，包含角色外观细节和风格描述

请返回JSON格式，格式为：
{"title": "故事标题", "pages": [{"text": "第一页文字", "imagePrompt": "英文图像提示词"}, ...]}

只返回JSON，不要其他文字。`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const json = JSON.parse(content.text) as ClaudeResponse;
  return json;
}

export async function generateIllustration(
  imagePrompt: string,
  style: StoryStyle
): Promise<string> {
  const stylePrefix = STYLE_MAP[style];
  const fullPrompt = `${stylePrefix}. ${imagePrompt}`;

  const output = await replicate.run(
    'stability-ai/sdxl:8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',
    {
      input: {
        prompt: fullPrompt,
        negative_prompt: 'text, watermark, ugly, deformed',
        width: 1024,
        height: 1024,
        num_outputs: 1,
      },
    }
  );

  // Replicate returns an array of URLs
  const url = Array.isArray(output) ? output[0] : String(output);
  return url;
}

export function buildImagePrompt(
  pagePrompt: string,
  characters: { name: string; visualClues: string }[]
): string {
  const charVisuals = characters.map(c => `${c.name}（${c.visualClues}）`).join(', ');
  return `${pagePrompt} Characters: ${charVisuals}.`;
}
```

注意：`stability-ai/stable-diffusion-3` 的版本 hash 可能变化，实际实现时需根据 Replicate 上最新版本调整。如果调用出错，回退为 `"stability-ai/stable-diffusion-3"`（不指定版本）。

- [ ] **Step 2: 提交**

```bash
git add lib/ai.ts
git commit -m "feat: add Claude story generation and Replicate illustration API"
```

---

### Task 5: API Route - 故事生成

**Files:**
- Create: `app/api/stories/generate/route.ts`

- [ ] **Step 1: 实现生成接口**

`app/api/stories/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GenerateRequest, Story, Page } from '@/types';
import { generateStoryOutline, generateIllustration, buildImagePrompt } from '@/lib/ai';
import { saveStory } from '@/lib/story-store';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.outline || !body.style || !body.ageRange) {
      return NextResponse.json(
        { error: '缺少必填字段：outline, style, ageRange' },
        { status: 400 }
      );
    }

    // Step 1: 生成故事文本 + 配图提示词
    const outline = await generateStoryOutline(
      body.outline,
      body.style,
      body.characters,
      body.ageRange
    );

    // Step 2: 并行生成所有插图
    const pagePromises = outline.pages.map(async (p, index) => {
      const prompt = buildImagePrompt(p.imagePrompt, body.characters);
      const imageUrl = await generateIllustration(prompt, body.style);
      return {
        pageNumber: index + 1,
        text: p.text,
        imagePrompt: p.imagePrompt,
        imageUrl,
      } as Page;
    });

    const pages = await Promise.all(pagePromises);

    // Step 3: 保存故事
    const story: Story = {
      id: uuidv4(),
      title: outline.title,
      style: body.style,
      ageRange: body.ageRange,
      characters: body.characters,
      pages,
      createdAt: new Date().toISOString(),
    };

    saveStory(story);

    return NextResponse.json({ story });
  } catch (error) {
    console.error('生成故事失败:', error);
    return NextResponse.json(
      { error: '生成故事失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add app/api/stories/generate/route.ts
git commit -m "feat: add story generation API route"
```

---

### Task 6: 根布局与全局样式

**Files:**
- Modify: `app/layout.tsx`（由脚手架生成，覆盖）
- Modify: `app/globals.css`（已确认）

- [ ] **Step 1: 更新布局**

`app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 故事绘本',
  description: '用 AI 生成属于你自己的儿童绘本故事',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 antialiased">
        <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-xl font-bold text-amber-800">
              AI 故事绘本
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/layout.tsx
git commit -m "feat: add root layout with header"
```

---

### Task 7: 首页 - 故事列表

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: 实现首页**

`app/page.tsx`:

```tsx
import Link from 'next/link';
import { listStories } from '@/lib/story-store';
import { StoryStyle } from '@/types';

const styleLabels: Record<StoryStyle, string> = {
  watercolor: '水彩',
  cartoon: '卡通',
  cutout: '剪纸',
  pixel: '像素',
};

const styleColors: Record<StoryStyle, string> = {
  watercolor: 'bg-blue-100 text-blue-700',
  cartoon: 'bg-yellow-100 text-yellow-700',
  cutout: 'bg-green-100 text-green-700',
  pixel: 'bg-purple-100 text-purple-700',
};

export default function HomePage() {
  const stories = listStories();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">我的故事集</h1>
        <Link
          href="/create"
          className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600"
        >
          创作新故事
        </Link>
      </div>

      {stories.length === 0 ? (
        <div className="mt-20 text-center">
          <p className="mb-4 text-lg text-amber-700">还没有故事，开始创作第一本吧！</p>
          <Link
            href="/create"
            className="inline-block rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600"
          >
            创作新故事
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map(story => (
            <Link
              key={story.id}
              href={`/stories/${story.id}`}
              className="group rounded-2xl bg-white p-4 shadow-md shadow-amber-100 transition hover:shadow-lg hover:shadow-amber-200"
            >
              {story.pages[0]?.imageUrl && (
                <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-amber-100">
                  <img
                    src={story.pages[0].imageUrl}
                    alt={story.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
              )}
              <h2 className="mb-1 text-lg font-bold text-amber-900">{story.title}</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styleColors[story.style]}`}
                >
                  {styleLabels[story.style]}
                </span>
                <span className="text-xs text-amber-500">
                  {story.pages.length} 页
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/page.tsx
git commit -m "feat: add home page with story list"
```

---

### Task 8: 创作页 - 表单

**Files:**
- Create: `app/create/page.tsx`

- [ ] **Step 1: 实现创作页**

`app/create/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StoryStyle, AgeRange, Character } from '@/types';

const styles: { value: StoryStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'watercolor', label: '水彩', emoji: '🎨', desc: '柔和的水彩画风格' },
  { value: 'cartoon', label: '卡通', emoji: '🧸', desc: '鲜艳的卡通风格' },
  { value: 'cutout', label: '剪纸', emoji: '✂️', desc: '剪纸拼贴风格' },
  { value: 'pixel', label: '像素', emoji: '🕹️', desc: '复古像素风格' },
];

const ageRanges: { value: AgeRange; label: string }[] = [
  { value: '3-5', label: '3-5 岁' },
  { value: '5-7', label: '5-7 岁' },
  { value: '7-10', label: '7-10 岁' },
];

export default function CreatePage() {
  const router = useRouter();
  const [outline, setOutline] = useState('');
  const [style, setStyle] = useState<StoryStyle>('watercolor');
  const [ageRange, setAgeRange] = useState<AgeRange>('3-5');
  const [characters, setCharacters] = useState<Character[]>([
    { name: '', description: '', visualClues: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const addCharacter = () => {
    setCharacters([...characters, { name: '', description: '', visualClues: '' }]);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    setCharacters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!outline.trim()) {
      setError('请输入故事梗概');
      return;
    }

    const validChars = characters.filter(c => c.name.trim());
    if (validChars.length === 0) {
      setError('请至少添加一个角色');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('正在构思故事...');

    try {
      const res = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline: outline.trim(),
          style,
          characters: validChars,
          ageRange,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }

      const data = await res.json();

      if (data.story?.pages?.length) {
        setProgress('正在绘制插图...');
      }

      router.push(`/stories/${data.story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-900">创作新故事</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 故事梗概 */}
        <div>
          <label className="mb-1.5 block font-semibold text-amber-800">
            故事梗概
          </label>
          <textarea
            value={outline}
            onChange={e => setOutline(e.target.value)}
            placeholder="例如：一只想学飞行的小企鹅，在朋友帮助下实现了梦想..."
            className="h-28 w-full rounded-xl border border-amber-200 bg-white/80 p-3 text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            disabled={loading}
          />
        </div>

        {/* 风格选择 */}
        <div>
          <label className="mb-1.5 block font-semibold text-amber-800">绘画风格</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {styles.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => !loading && setStyle(s.value)}
                className={`rounded-xl border-2 p-3 text-center transition ${
                  style === s.value
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-amber-200 bg-white/80 hover:border-amber-300'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="mb-1 text-2xl">{s.emoji}</div>
                <div className="font-semibold text-amber-800">{s.label}</div>
                <div className="text-xs text-amber-500">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 年龄段 */}
        <div>
          <label className="mb-1.5 block font-semibold text-amber-800">适合年龄</label>
          <div className="flex gap-3">
            {ageRanges.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => !loading && setAgeRange(r.value)}
                className={`rounded-lg border-2 px-4 py-2 transition ${
                  ageRange === r.value
                    ? 'border-amber-500 bg-amber-50 font-semibold text-amber-800'
                    : 'border-amber-200 bg-white/80 text-amber-600 hover:border-amber-300'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 角色设定 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-semibold text-amber-800">角色设定</label>
            <button
              type="button"
              onClick={addCharacter}
              disabled={loading || characters.length >= 3}
              className="text-sm text-amber-600 hover:text-amber-800 disabled:text-amber-300"
            >
              + 添加角色
            </button>
          </div>
          <div className="space-y-3">
            {characters.map((char, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-white/80 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-700">
                    角色 {i + 1}
                  </span>
                  {characters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCharacter(i)}
                      disabled={loading}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    placeholder="名称"
                    value={char.name}
                    onChange={e => updateCharacter(i, 'name', e.target.value)}
                    className="rounded-lg border border-amber-200 p-2 text-sm text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none"
                    disabled={loading}
                  />
                  <input
                    placeholder="简介（如：小企鹅）"
                    value={char.description}
                    onChange={e => updateCharacter(i, 'description', e.target.value)}
                    className="rounded-lg border border-amber-200 p-2 text-sm text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none"
                    disabled={loading}
                  />
                  <input
                    placeholder="外观特征（如：黄色嘴巴、蓝色围巾）"
                    value={char.visualClues}
                    onChange={e => updateCharacter(i, 'visualClues', e.target.value)}
                    className="rounded-lg border border-amber-200 p-2 text-sm text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none"
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3 text-lg font-bold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {progress}
            </span>
          ) : (
            '开始生成'
          )}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/create/page.tsx
git commit -m "feat: add story creation form page"
```

---

### Task 9: 阅读页 - 翻页阅读器

**Files:**
- Create: `app/stories/[id]/page.tsx`

- [ ] **Step 1: 实现阅读页**

`app/stories/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Story, StoryStyle } from '@/types';

const styleLabels: Record<StoryStyle, string> = {
  watercolor: '水彩',
  cartoon: '卡通',
  cutout: '剪纸',
  pixel: '像素',
};

export default function StoryReaderPage() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stories/${params.id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.story) setStory(data.story);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="mt-20 text-center text-amber-700">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-300 border-t-amber-600" />
        加载中...
      </div>
    );
  }

  if (!story) {
    return (
      <div className="mt-20 text-center">
        <p className="mb-4 text-lg text-amber-700">故事未找到</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-xl bg-amber-500 px-5 py-2 text-white"
        >
          返回首页
        </button>
      </div>
    );
  }

  const page = story.pages[currentPage];
  const totalPages = story.pages.length;

  const goPrev = () => setCurrentPage(Math.max(0, currentPage - 1));
  const goNext = () => setCurrentPage(Math.min(totalPages - 1, currentPage + 1));

  return (
    <div className="flex flex-col items-center">
      {/* 标题区 */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-amber-900">{story.title}</h1>
        <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-sm text-amber-700">
          {styleLabels[story.style]} · 适合 {story.ageRange} 岁
        </span>
      </div>

      {/* 翻页容器 */}
      <div className="relative w-full max-w-lg">
        {/* 页面卡片 */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-amber-200/50">
          {/* 插图 */}
          <div className="aspect-[4/3] bg-amber-50">
            {page.imageUrl ? (
              <img
                src={page.imageUrl}
                alt={`第 ${page.pageNumber} 页`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-amber-300">
                插图生成中...
              </div>
            )}
          </div>
          {/* 文字 */}
          <div className="p-6 text-center">
            <p className="text-lg leading-relaxed text-amber-900">{page.text}</p>
          </div>
        </div>

        {/* 左右翻页按钮 */}
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          className="absolute left-0 top-1/2 -translate-x-12 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white disabled:opacity-30"
        >
          <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goNext}
          disabled={currentPage === totalPages - 1}
          className="absolute right-0 top-1/2 translate-x-12 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white disabled:opacity-30"
        >
          <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 页码 */}
      <div className="mt-4 text-sm text-amber-600">
        第 {currentPage + 1} 页 / 共 {totalPages} 页
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => router.push('/')}
          className="rounded-lg border border-amber-300 px-4 py-2 text-amber-700 transition hover:bg-amber-50"
        >
          返回列表
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 实现获取单个故事的 API（阅读页需要）**

`app/api/stories/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getStory } from '@/lib/story-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const story = getStory(params.id);

  if (!story) {
    return NextResponse.json({ error: '故事未找到' }, { status: 404 });
  }

  return NextResponse.json({ story });
}
```

- [ ] **Step 3: 提交**

```bash
git add app/stories/\[id\]/page.tsx app/api/stories/\[id\]/route.ts
git commit -m "feat: add story reader page with flip navigation"
```

---

### Task 10: 最终验证

- [ ] **Step 1: 确保构建通过**

```bash
npm run build
```

Expected: 构建成功，无错误。

- [ ] **Step 2: 确认 .stories/ 目录被 gitignore**

```bash
git status
```

Expected: `.stories/` 目录不显示在 untracked files 中。

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "chore: complete MVP implementation"
```

---

## 自检

**1. Spec coverage:**
- 数据模型 ✓（types.ts）
- 核心链路 ✓（创作页 → API → 存储 → 阅读页）
- 风格选择 ✓（4种风格卡片）
- 年龄段 ✓
- 角色设定 ✓（可增删角色）
- 翻页阅读 ✓（左右箭头 + 页码）
- PDF 导出 ✓（延后，未实现）
- 进度反馈 ✓（loading 状态 + progress 文字）
- 错误处理 ✓（表单验证 + API 错误提示）

**2. Placeholder check:**
- 没有 "TBD"、"TODO" 等占位符
- 每个步骤包含完整代码
- 所有文件路径明确

**3. Type consistency:**
- `Story`, `Page`, `Character`, `StoryStyle`, `AgeRange`, `GenerateRequest` 在 types.ts 定义，所有 task 中引用一致
- API route 使用 `GenerateRequest` 类型接收请求
- story-store 使用 `Story` 类型
- AI 服务输出 `ClaudeResponse` 内部类型，映射到 `Page`

**4. Missing items from spec:**
- 阅读页需要获取单个故事的 API → Task 9 Step 2 已添加
- 首页是 server component 调用 listStories → 正确（直接 import）
- 阅读页需要 client-side fetch → 已实现