import { StoryStyle } from '@/types';

const API_BASE = 'https://apihub.agnes-ai.com/v1';

if (!process.env.AGNES_API_KEY) throw new Error('Missing AGNES_API_KEY');
const API_KEY = process.env.AGNES_API_KEY;

const STYLE_MAP: Record<StoryStyle, string> = {
  watercolor: 'watercolor illustration style, soft pastel colors, gentle brush strokes',
  cartoon: 'colorful cartoon illustration style, bold outlines, vibrant colors',
  cutout: 'paper cutout craft style, layered paper textures, folk art',
  pixel: 'retro pixel art style, 16-bit game graphics, chunky pixels',
};

const PAGE_COUNT = 7;

interface StoryOutline {
  title: string;
  pages: { text: string; imagePrompt: string }[];
}

function extractJson(text: string): StoryOutline {
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) cleaned = jsonMatch[1].trim();
  return JSON.parse(cleaned) as StoryOutline;
}

export async function generateStoryOutline(
  outline: string,
  style: StoryStyle,
  characters: { name: string; description: string; visualClues: string }[],
  ageRange: string
): Promise<StoryOutline> {
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

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'agnes-2.0-flash',
        messages: [
          { role: 'system', content: 'You are a professional children\'s story writer.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Agnes API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Agnes API');

    return extractJson(content);
  } catch (err) {
    throw new Error(
      err instanceof SyntaxError
        ? 'AI 返回了格式错误的结果，请重试'
        : '故事生成失败，请稍后重试'
    );
  }
}

export async function generateIllustration(
  imagePrompt: string,
  style: StoryStyle
): Promise<string> {
  const stylePrefix = STYLE_MAP[style];
  const fullPrompt = `${stylePrefix}. ${imagePrompt}`;

  try {
    const res = await fetch(`${API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'agnes-image-2.1-flash',
        prompt: fullPrompt,
        size: '1024x1024',
        extra_body: {
          response_format: 'url',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Agnes Image API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const url: string | null = data.data?.[0]?.url;
    if (!url) throw new Error('Empty image URL in Agnes response');

    return url;
  } catch {
    throw new Error('插图生成失败，请重试');
  }
}

export function buildImagePrompt(
  pagePrompt: string,
  characters: { name: string; visualClues: string }[]
): string {
  if (characters.length === 0) return pagePrompt;
  const charVisuals = characters.map(c => `${c.name}（${c.visualClues}）`).join(', ');
  return `${pagePrompt} Characters: ${charVisuals}.`;
}
