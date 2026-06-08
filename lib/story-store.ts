import { Story } from '@/types';
import fs from 'fs';
import path from 'path';

const STORIES_DIR = path.join(
  process.env.VERCEL ? '/tmp' : process.cwd(),
  '.stories'
);

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
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Story;
  } catch {
    return null;
  }
}

export function listStories(): Story[] {
  ensureDir();
  const files = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.json'));
  return files
    .map(f => getStory(f.replace('.json', '')))
    .filter((s): s is Story => s !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
