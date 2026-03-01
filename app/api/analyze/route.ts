import { NextRequest, NextResponse } from "next/server";
import { Scraper } from "@the-convocation/twitter-scraper";

export const runtime = "nodejs";
export const maxDuration = 30;

function extractUsername(input: string): string {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/,
    /^@?([A-Za-z0-9_]+)$/,
  ];
  for (const pattern of patterns) {
    const m = input.trim().match(pattern);
    if (m) return m[1];
  }
  throw new Error("Invalid X username or URL");
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const username = extractUsername(url);
    const scraper = new Scraper();

    // ユーザー情報取得
    const profile = await scraper.getProfile(username);
    if (!profile) {
      return NextResponse.json(
        { error: `@${username} が見つかりません` },
        { status: 404 }
      );
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const tweets: Array<{
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
    }> = [];

    // 元々動いていた100件取得に戻し、3ヶ月フィルターだけ追加
    const generator = scraper.getTweets(username, 100);
    for await (const tweet of generator) {
      if (!tweet.id) continue;
      if (tweet.timeParsed && tweet.timeParsed < threeMonthsAgo) continue;

      const likes = tweet.likes ?? 0;
      const retweets = tweet.retweets ?? 0;
      const replies = tweet.replies ?? 0;
      const views = tweet.views ?? 0;
      const bookmarks = tweet.bookmarkCount ?? 0;
      const score = views > 0 ? views : (likes * 2 + retweets * 3 + replies + bookmarks);

      tweets.push({
        id: tweet.id,
        text: tweet.text ?? "",
        likes,
        retweets,
        replies,
        views,
        bookmarks,
        score,
        url: `https://x.com/${username}/status/${tweet.id}`,
        createdAt: tweet.timeParsed?.toISOString() ?? "",
      });
    }

    const top10 = tweets
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      username,
      displayName: profile.name,
      avatar: profile.avatar,
      followers: profile.followersCount,
      total: tweets.length,
      top10,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
