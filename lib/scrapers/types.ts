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
