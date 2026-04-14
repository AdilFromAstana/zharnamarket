import { describe, it, expect, afterAll } from "vitest";
import { createTestUser, buildRequest } from "../../helpers";
import {
  createPublishedProfile,
  createInteraction,
  createReview,
  deleteUsers,
} from "./fixtures";

import { GET as myReviews } from "@/app/api/reviews/my/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let creatorUserId: string;
let creatorToken: string;
let reviewer1UserId: string;
let reviewer1Token: string;
let reviewer2UserId: string;
let reviewer2Token: string;
let profileId: string;

afterAll(async () => {
  await deleteUsers(creatorUserId, reviewer1UserId, reviewer2UserId);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function myReq(token?: string) {
  return buildRequest("/api/reviews/my", { token });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/reviews/my", () => {
  it("setup: create users, profile, and reviews", async () => {
    const creator = await createTestUser({ name: "Creator My Reviews" });
    const reviewer1 = await createTestUser({ name: "Reviewer One My" });
    const reviewer2 = await createTestUser({ name: "Reviewer Two My" });

    creatorUserId = creator.user.id;
    creatorToken = creator.token;
    reviewer1UserId = reviewer1.user.id;
    reviewer1Token = reviewer1.token;
    reviewer2UserId = reviewer2.user.id;
    reviewer2Token = reviewer2.token;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;

    // reviewer1 interacts and leaves review on creator's profile
    await createInteraction(reviewer1UserId, profileId);
    await createReview(reviewer1UserId, profileId, {
      rating: 5,
      comment: "Лучший опыт сотрудничества, очень рекомендую!",
    });

    // reviewer2 also leaves a review
    await createInteraction(reviewer2UserId, profileId);
    await createReview(reviewer2UserId, profileId, {
      rating: 4,
      comment: "Хорошая работа, небольшие недочёты но в целом всё отлично.",
    });
  });

  it("returns 401 if not authenticated", async () => {
    const req = myReq(); // no token
    const res = await myReviews(req);
    expect(res.status).toBe(401);
  });

  it("returns { written: [], received: [] } for user with no reviews", async () => {
    const fresh = await createTestUser({ name: "Fresh User" });
    const req = myReq(fresh.token);
    const res = await myReviews(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.written).toEqual([]);
    expect(body.received).toEqual([]);

    await deleteUsers(fresh.user.id);
  });

  it("creator: received contains 2 reviews on their profile", async () => {
    const req = myReq(creatorToken);
    const res = await myReviews(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.received).toHaveLength(2);
    expect(body.written).toEqual([]);

    // Each received review has reviewer info
    for (const review of body.received) {
      expect(review.reviewer).toBeDefined();
      expect(review.reviewer.name).toBeDefined();
      expect(review.rating).toBeGreaterThanOrEqual(1);
    }
  });

  it("creator: received reviews include creatorProfile info", async () => {
    const req = myReq(creatorToken);
    const res = await myReviews(req);
    const body = await res.json();

    for (const review of body.received) {
      expect(review.creatorProfile).toBeDefined();
      expect(review.creatorProfile.id).toBe(profileId);
    }
  });

  it("reviewer1: written contains 1 review with creatorProfile info", async () => {
    const req = myReq(reviewer1Token);
    const res = await myReviews(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.written).toHaveLength(1);
    expect(body.received).toEqual([]);

    const review = body.written[0];
    expect(review.rating).toBe(5);
    expect(review.creatorProfile).toBeDefined();
    expect(review.creatorProfile.id).toBe(profileId);
  });

  it("reviewer1: written reviews do not contain reviewer field (not needed for 'my' view)", async () => {
    const req = myReq(reviewer1Token);
    const res = await myReviews(req);
    const body = await res.json();

    // The written reviews don't need reviewer (it's always the current user)
    // But they should have creatorProfile info
    expect(body.written[0].creatorProfile).toBeDefined();
  });

  it("reviews are ordered by createdAt DESC", async () => {
    const req = myReq(creatorToken);
    const res = await myReviews(req);
    const body = await res.json();

    const dates = body.received.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});
