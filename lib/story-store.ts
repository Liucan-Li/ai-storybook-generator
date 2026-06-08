import { Story } from '@/types';

const STORAGE_KEY = 'storybook-stories';

function loadAll(): Story[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Story[] : [];
  } catch {
    return [];
  }
}

function saveAll(stories: Story[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  } catch {
    // localStorage full or unavailable
  }
}

export function saveStory(story: Story): void {
  const stories = loadAll();
  stories.unshift(story);
  saveAll(stories);
}

export function getStory(id: string): Story | null {
  const stories = loadAll();
  return stories.find(s => s.id === id) || null;
}

export function listStories(): Story[] {
  return loadAll();
}
