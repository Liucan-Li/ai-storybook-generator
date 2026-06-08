import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 故事绘本',
  description: '用 AI 生成属于你自己的儿童绘本故事',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 antialiased">
        <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-xl font-bold text-amber-800">
              AI 故事绘本
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}