export type FollowersResult =
  | {
      ok: true;
      username: string;
      followers: number;
      following?: number;
      likes?: number;
      source: string;
    }
  | { ok: false; error: string };

export type VideoMetaResult =
  | {
      ok: true;
      platform: "YouTube" | "TikTok" | "Instagram" | "VK";
      videoId: string;
      title: string | null;
      views: number | null;
      likes: number | null;
      thumbnail: string | null;
      source: string;
    }
  | { ok: false; error: string };
