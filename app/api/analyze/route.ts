import { NextRequest, NextResponse } from "next/server";
import { Scraper } from "@the-convocation/twitter-scraper";

export const runtime = "nodejs";
export const maxDuration = 30;

function extractUsername(input: string): string {
  // https://x.com/username or https://twitter.com/username or just @username or username
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

    // 環境変数にX認証情報があればログイン（ゲスト制限を回避）
    const twitterUser = process.env.TWITTER_USERNAME;
    const twitterPass = process.env.TWITTER_PASSWORD;
    if (twitterUser && twitterPass) {
      await scraper.login(twitterUser, twitterPass);
    }

    // ユーザー情報取得
    const profile = await scraper.getProfile(username);
    if (!profile) {
      return NextResponse.json(
        { error: `@${username} が見つかりません` },
        { status: 404 }
      );
    }

    // 直近3ヶ月の投稿を取得
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

    // 最大500件取得しながら3ヶ月より古くなったら停止
    const generator = scraper.getTweets(username, 500);
    for await (const tweet of generator) {
      if (!tweet.id) continue;

      // 3ヶ月より古い投稿が来たら打ち切り（新しい順に返ってくるため）
      if (tweet.timeParsed && tweet.timeParsed < threeMonthsAgo) break;

      const likes = tweet.likes ?? 0;
      const retweets = tweet.retweets ?? 0;
      const replies = tweet.replies ?? 0;
      const views = tweet.views ?? 0;
      const bookmarks = tweet.bookmarkCount ?? 0;

      // スコア: ビュー数があればビュー数優先、なければエンゲージメント
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

    // スコア降順でTOP10
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
