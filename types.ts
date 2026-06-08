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
  imageUrl: string | null;
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
