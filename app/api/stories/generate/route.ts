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
      body.characters || [],
      body.ageRange
    );

    // Step 2: 并行生成所有插图
    const pagePromises = outline.pages.map(async (p, index) => {
      const prompt = buildImagePrompt(p.imagePrompt, body.characters || []);
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
      characters: body.characters || [],
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