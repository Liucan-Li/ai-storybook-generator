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