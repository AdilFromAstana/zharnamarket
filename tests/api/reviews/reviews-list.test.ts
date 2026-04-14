import { describe, it, expect, afterAll } from "vitest";
import { createTestUser, buildRequest } from "../../helpers";
import {
  createPublishedProfile,
  createReview,
  createInteraction,
  deleteUsers,
} from "./fixtures";

import { GET as listReviews } from "@/app/api/creators/[id]/reviews/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let creatorUserId: string;
let reviewer1Id: string;
let reviewer2Id: string;
let reviewer3Id: string;
let profileId: string;
let emptyProfileId: string;

afterAll(async () => {
  await deleteUsers(creatorUserId, reviewer1Id, reviewer2Id, reviewer3Id);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listReq(id: string, query = "") {
  return buildRequest(`/api/creators/${id}/reviews${query}`);
}

function listParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/creators/[id]/reviews", () => {
  it("setup: create users, profiles, and reviews", async () => {
    const creator = await createTestUser({ name: "Creator" });
    const r1 = await createTestUser({ name: "Reviewer One" });
    const r2 = await createTestUser({ name: "Reviewer Two" });
    const r3 = await createTestUser({ name: "Reviewer Three" });

    creatorUserId = creator.user.id;
    reviewer1Id = r1.user.id;
    reviewer2Id = r2.user.id;
    reviewer3Id = r3.user.id;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;

    const emptyProfile = await createPublishedProfile(creatorUserId);
    emptyProfileId = emptyProfile.id;

    // Create 3 reviews on profileId
    await createInteraction(reviewer1Id, profileId);
    await createInteraction(reviewer2Id, profileId);
    await createInteraction(reviewer3Id, profileId);

    await createReview(reviewer1Id, profileId, { rating: 5, comment: "Отличный креатор, работаем ещё!" });
    await createReview(reviewer2Id, profileId, { rating: 3, comment: "Нормально, но сроки затянулись немного." });
    await createReview(reviewer3Id, profileId, { rating: 4, comment: "Хорошее качество контента, рекомендую." });
  });

  it("returns 404 for non-existent profile", async () => {
    const req = listReq("nonexistent-profile-id");
    const res = await listReviews(req, listParams("nonexistent-profile-id"));
    expect(res.status).toBe(404);
  });

  it("returns empty data for profile with no reviews", async () => {
    const req = listReq(emptyProfileId);
    const res = await listReviews(req, listParams(emptyProfileId));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.averageRating).toBe(0);
  });

  it("returns list of reviews with reviewer data", async () => {
    const req = listReq(profileId);
    const res = await listReviews(req, listParams(profileId));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);

    // Each review has reviewer info
    for (const review of body.data) {
      expect(review.reviewer).toBeDefined();
      expect(review.reviewer.id).toBeDefined();
      expect(review.reviewer.name).toBeDefined();
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
      expect(review.comment).toBeDefined();
    }
  });

  it("returns correct averageRating and ratingDistribution", async () => {
    const req = listReq(profileId);
    const res = await listReviews(req, listParams(profileId));
    const body = await res.json();

    // Average of 5 + 3 + 4 = 4.0
    expect(body.averageRating).toBe(4.0);

    expect(body.ratingDistribution).toBeDefined();
    expect(body.ratingDistribution[5]).toBe(1);
    expect(body.ratingDistribution[4]).toBe(1);
    expect(body.ratingDistribution[3]).toBe(1);
    expect(body.ratingDistribution[2]).toBe(0);
    expect(body.ratingDistribution[1]).toBe(0);
  });

  it("returns correct pagination metadata", async () => {
    const req = listReq(profileId, "?page=1&limit=10");
    const res = await listReviews(req, listParams(profileId));
    const body = await res.json();

    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(1);
  });

  it("pagination: page=1&limit=2 returns first 2 reviews", async () => {
    const req = listReq(profileId, "?page=1&limit=2");
    const res = await listReviews(req, listParams(profileId));
    const body = await res.json();

    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
  });

  it("pagination: page=2&limit=2 returns remaining 1 review", async () => {
    const req = listReq(profileId, "?page=2&limit=2");
    const res = await listReviews(req, listParams(profileId));
    const body = await res.json();

    expect(body.data).toHaveLength(1);
  });

  it("reviews are ordered by createdAt DESC (newest first)", async () => {
    const req = listReq(profileId);
    const res = await listReviews(req, listParams(profileId));
    const body = await res.json();

    const dates = body.data.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});
