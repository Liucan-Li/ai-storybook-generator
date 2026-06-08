import { NextRequest, NextResponse } from 'next/server';
import { listStories } from '@/lib/story-store';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const stories = listStories();
    return NextResponse.json({ stories });
  } catch {
    return NextResponse.json({ stories: [] });
  }
}