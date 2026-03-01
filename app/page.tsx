"use client";

import { useState } from "react";

interface Tweet {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  bookmarks: number;
  score: number;
  url: string;
  createdAt: string;
}

interface Result {
  username: string;
  displayName: string;
  avatar: string;
  followers: number;
  total: number;
  top10: Tweet[];
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}日前`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}時間前`;
  const m = Math.floor(diff / 60000);
  return `${m}分前`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://pbs.twimg.com/profile_images/1902427070703267840/nf-lE3WD.jpg" alt="Kくん" className="w-10 h-10 rounded-full" />
          <div>
            <h1 className="text-xl font-bold">KくんXバズアナライザー</h1>
            <p className="text-zinc-400 text-sm">競合アカウントの話題の投稿TOP10を解析</p>
            <p className="text-zinc-600 text-xs">開発者=Kくん※2次利用禁止</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* 入力エリア */}
        <div className="space-y-3">
          <label className="block text-sm text-zinc-400">
            競合のX URLまたは @ユーザー名
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://x.com/username または @username"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              {loading ? "解析中..." : "解析する"}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">投稿を取得中...</p>
          </div>
        )}

        {/* 結果 */}
        {result && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">
                @{result.username} の話題の投稿 TOP {result.top10.length}
              </h2>
              <p className="text-zinc-500 text-sm">
                話題の投稿から選出
              </p>
            </div>

            {/* TOP10 リスト */}
            <div className="space-y-3">
              {result.top10.map((tweet, i) => (
                <a
                  key={tweet.id}
                  href={tweet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all group"
                >
                  <div className="flex gap-3">
                    {/* ランク */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mt-0.5">
                      {i === 0 ? (
                        <span className="text-xl">🥇</span>
                      ) : i === 1 ? (
                        <span className="text-xl">🥈</span>
                      ) : i === 2 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-zinc-500 font-bold text-sm">#{i + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* ツイート本文 */}
                      <p className="text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap break-words">
                        {tweet.text}
                      </p>

                      {/* メトリクス */}
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                        {tweet.views > 0 && (
                          <span className="flex items-center gap-1">
                            <span>👁</span>
                            <span className="font-semibold text-white">{formatNum(tweet.views)}</span>
                            <span>ビュー</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span>❤️</span>
                          <span className="font-semibold text-white">{formatNum(tweet.likes)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🔁</span>
                          <span className="font-semibold text-white">{formatNum(tweet.retweets)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💬</span>
                          <span className="font-semibold text-white">{formatNum(tweet.replies)}</span>
                        </span>
                        {tweet.bookmarks > 0 && (
                          <span className="flex items-center gap-1">
                            <span>🔖</span>
                            <span className="font-semibold text-white">{formatNum(tweet.bookmarks)}</span>
                          </span>
                        )}
                        {tweet.createdAt && (
                          <span className="ml-auto text-zinc-600">{timeAgo(tweet.createdAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* 外部リンクアイコン */}
                    <div className="flex-shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
