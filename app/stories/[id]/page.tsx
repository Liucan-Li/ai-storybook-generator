'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pdf, Font } from '@react-pdf/renderer';
import { Story, StoryStyle } from '@/types';
import { StoryPDFDocument } from '@/lib/story-pdf';
import { getStory } from '@/lib/story-store';

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
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [erroredImages, setErroredImages] = useState<Set<number>>(new Set());

  const handleImageLoad = (pageNumber: number) => {
    setLoadedImages(prev => new Set(prev).add(pageNumber));
  };

  const handleImageError = (pageNumber: number) => {
    setErroredImages(prev => new Set(prev).add(pageNumber));
    setLoadedImages(prev => new Set(prev).add(pageNumber));
  };

  useEffect(() => {
    const s = getStory(params.id as string);
    setStory(s);
    setLoading(false);
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

  const goPrev = useCallback(() => setCurrentPage(c => Math.max(0, c - 1)), []);
  const goNext = useCallback(() => setCurrentPage(c => Math.min(totalPages - 1, c + 1)), [totalPages]);

  // Touch swipe gesture
  const touchStartX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return; // minimum swipe distance
    if (diff > 0) goNext(); else goPrev();
  }, [goPrev, goNext]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Pre-fetch images through same-origin proxy (bypasses CORS) as data URIs
      const enrichedPages = await Promise.all(
        story.pages.map(async (p) => {
          if (!p.imageUrl) return p;
          try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(p.imageUrl)}`;
            const res = await fetch(proxyUrl);
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            return { ...p, imageUrl: dataUrl };
          } catch {
            return p;
          }
        })
      );
      const enrichedStory = { ...story, pages: enrichedPages };

      // Load Chinese font before generating PDF
      try {
        const fontRes = await fetch('/fonts/NotoSansSC-Regular.ttf');
        const fontBlob = await fontRes.blob();
        const fontDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(fontBlob);
        });
        Font.register({
          family: 'Noto Sans SC',
          fonts: [{ src: fontDataUrl, fontWeight: 400 }],
        });
      } catch {
        // Font fallback
      }
      const blob = await pdf(<StoryPDFDocument story={enrichedStory} />).toBlob();
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
      <div
        className="relative w-full max-w-lg touch-pan-y select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* 页面卡片 */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-amber-200/50">
          {/* 插图 */}
          <div className="aspect-[4/3] bg-amber-50">
            {page.imageUrl ? (
              <>
                {!loadedImages.has(page.pageNumber) && (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-300 border-t-amber-600" />
                  </div>
                )}
                <img
                  src={page.imageUrl}
                  alt={`第 ${page.pageNumber} 页`}
                  className={`h-full w-full object-cover transition-opacity duration-300 ${loadedImages.has(page.pageNumber) ? 'opacity-100' : 'absolute inset-0 opacity-0'}`}
                  onLoad={() => handleImageLoad(page.pageNumber)}
                  onError={() => handleImageError(page.pageNumber)}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-amber-300">
                插图不可用
              </div>
            )}
          </div>
          {/* 文字 */}
          <div className="p-6 text-center">
            <p className="text-lg leading-relaxed text-amber-900">{page.text}</p>
          </div>
        </div>
      </div>

      {/* 页码 + 翻页按钮 */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          className="rounded-full p-1.5 text-amber-600 transition hover:bg-amber-100 active:scale-95 disabled:opacity-30"
          aria-label="上一页"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm text-amber-600 min-w-[80px] text-center">
          第 {currentPage + 1} 页 / 共 {totalPages} 页
        </span>
        <button
          onClick={goNext}
          disabled={currentPage === totalPages - 1}
          className="rounded-full p-1.5 text-amber-600 transition hover:bg-amber-100 active:scale-95 disabled:opacity-30"
          aria-label="下一页"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
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