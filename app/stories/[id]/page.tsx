'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { Story, StoryStyle } from '@/types';
import { StoryPDFDocument } from '@/lib/story-pdf';

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
  const [downloading, setDownloading] = useState(false);

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

  if (!story || !story.pages || story.pages.length === 0) {
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

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await pdf(<StoryPDFDocument story={story} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

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
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white shadow transition hover:bg-amber-600 disabled:opacity-60"
        >
          {downloading ? '生成中...' : '导出 PDF'}
        </button>
      </div>
    </div>
  );
}