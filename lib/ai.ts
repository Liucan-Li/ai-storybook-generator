import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { StoryStyle } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

const STYLE_MAP: Record<StoryStyle, string> = {
  watercolor: 'watercolor illustration style, soft pastel colors, gentle brush strokes',
  cartoon: 'colorful cartoon illustration style, bold outlines, vibrant colors',
  cutout: 'paper cutout craft style, layered paper textures, folk art',
  pixel: 'retro pixel art style, 16-bit game graphics, chunky pixels',
};

const PAGE_COUNT = 7;

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

  const url = Array.isArray(output) ? String(output[0]) : String(output);
  return url;
}

export function buildImagePrompt(
  pagePrompt: string,
  characters: { name: string; visualClues: string }[]
): string {
  const charVisuals = characters.map(c => `${c.name}（${c.visualClues}）`).join(', ');
  return `${pagePrompt} Characters: ${charVisuals}.`;
}
