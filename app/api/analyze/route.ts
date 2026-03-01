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

    let displayName = username;

    const generator = scraper.getTweets(username, 100);
    for await (const tweet of generator) {
      if (!tweet.id) continue;
      if (tweet.name) displayName = tweet.name;

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
      displayName,
      avatar: "",
      followers: 0,
      total: tweets.length,
      top10,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
