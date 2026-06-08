'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StoryStyle, AgeRange, Character } from '@/types';
import { saveStory } from '@/lib/story-store';

const styles: { value: StoryStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'watercolor', label: '水彩', emoji: '🎨', desc: '柔和的水彩画风格' },
  { value: 'cartoon', label: '卡通', emoji: '🧸', desc: '鲜艳的卡通风格' },
  { value: 'cutout', label: '剪纸', emoji: '✂️', desc: '剪纸拼贴风格' },
  { value: 'pixel', label: '像素', emoji: '🕹️', desc: '复古像素风格' },
];

const ageRanges: { value: AgeRange; label: string }[] = [
  { value: '3-5', label: '3-5 岁' },
  { value: '5-7', label: '5-7 岁' },
  { value: '7-10', label: '7-10 岁' },
];

export default function CreatePage() {
  const router = useRouter();
  const [outline, setOutline] = useState('');
  const [style, setStyle] = useState<StoryStyle>('watercolor');
  const [ageRange, setAgeRange] = useState<AgeRange>('3-5');
  const [characters, setCharacters] = useState<Character[]>([
    { name: '', description: '', visualClues: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const addCharacter = () => {
    setCharacters([...characters, { name: '', description: '', visualClues: '' }]);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    setCharacters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!outline.trim()) {
      setError('请输入故事梗概');
      return;
    }

    const validChars = characters.filter(c => c.name.trim());
    if (validChars.length === 0) {
      setError('请至少添加一个角色');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('正在构思故事...');

    try {
      const res = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline: outline.trim(),
          style,
          characters: validChars,
          ageRange,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }

      const data = await res.json();

      // Save to client-side localStorage
      saveStory(data.story);

      if (data.story?.pages?.length) {
        setProgress('正在绘制插图...');
      }

      router.push(`/stories/${data.story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-900">创作新故事</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 故事梗概 */}
        <div>
          <label className="mb-1.5 block font-semibold text-amber-800">
            故事梗概
          </label>
          <textarea
            value={outline}
            onChange={e => setOutline(e.target.value)}
            placeholder="例如：一只想学飞行的小企鹅，在朋友帮助下实现了梦想..."
            className="h-28 w-full rounded-xl border border-amber-200 bg-white/80 p-3 text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            disabled={loading}
          />
        </div>

        {/* 风格选择 */}
        <div>
          <label className="mb-1.5 block font-semibold text-amber-800">绘画风格</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {styles.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => !loading && setStyle(s.value)}
                className={`rounded-xl border-2 p-3 text-center transition ${
                  style === s.value
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-amber-200 bg-white/80 hover:border-amber-300'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="mb-1 text-2xl">{s.emoji}</div>
                <div className="font-semibold text-amber-800">{s.label}</div>
                <div className="text-xs text-amber-500">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 年龄段 */}
        <div>
          <label className="mb-1.5 block font-semibold text-amber-800">适合年龄</label>
          <div className="flex gap-3">
            {ageRanges.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => !loading && setAgeRange(r.value)}
                className={`rounded-lg border-2 px-4 py-2 transition ${
                  ageRange === r.value
                    ? 'border-amber-500 bg-amber-50 font-semibold text-amber-800'
                    : 'border-amber-200 bg-white/80 text-amber-600 hover:border-amber-300'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 角色设定 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-semibold text-amber-800">角色设定</label>
            <button
              type="button"
              onClick={addCharacter}
              disabled={loading || characters.length >= 3}
              className="text-sm text-amber-600 hover:text-amber-800 disabled:text-amber-300"
            >
              + 添加角色
            </button>
          </div>
          <div className="space-y-3">
            {characters.map((char, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-white/80 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-700">
                    角色 {i + 1}
                  </span>
                  {characters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCharacter(i)}
                      disabled={loading}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    placeholder="名称"
                    value={char.name}
                    onChange={e => updateCharacter(i, 'name', e.target.value)}
                    className="rounded-lg border border-amber-200 p-2 text-sm text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none"
                    disabled={loading}
                  />
                  <input
                    placeholder="简介（如：小企鹅）"
                    value={char.description}
                    onChange={e => updateCharacter(i, 'description', e.target.value)}
                    className="rounded-lg border border-amber-200 p-2 text-sm text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none"
                    disabled={loading}
                  />
                  <input
                    placeholder="外观特征（如：黄色嘴巴、蓝色围巾）"
                    value={char.visualClues}
                    onChange={e => updateCharacter(i, 'visualClues', e.target.value)}
                    className="rounded-lg border border-amber-200 p-2 text-sm text-amber-900 placeholder-amber-300 focus:border-amber-400 focus:outline-none"
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3 text-lg font-bold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {progress}
            </span>
          ) : (
            '开始生成'
          )}
        </button>
      </form>
    </div>
  );
}