'use client';

import { useEffect, useState } from 'react';
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
  const [stories, setStories] = useState<ReturnType<typeof listStories>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStories(listStories());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="mt-20 text-center text-amber-700">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-300 border-t-amber-600" />
        加载中...
      </div>
    );
  }

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