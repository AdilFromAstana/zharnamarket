import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, createAdminUser, buildRequest } from "../../helpers";
import {
  createPublishedProfile,
  createInteraction,
  createReview,
  deleteUsers,
} from "./fixtures";

import { DELETE as deleteReview } from "@/app/api/reviews/[id]/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let creatorUserId: string;
let reviewerUserId: string;
let reviewerToken: string;
let strangerUserId: string;
let strangerToken: string;
let adminUserId: string;
let adminToken: string;
let profileId: string;

afterAll(async () => {
  await deleteUsers(creatorUserId, reviewerUserId, strangerUserId, adminUserId);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delReq(id: string, token?: string) {
  return buildRequest(`/api/reviews/${id}`, { method: "DELETE", token });
}

function delParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const COMMENT = "Сотрудничество прошло хорошо, рекомендую этого исполнителя.";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/reviews/[id]", () => {
  it("setup: create users and profile", async () => {
    const creator = await createTestUser({ name: "Creator Delete" });
    const reviewer = await createTestUser({ name: "Reviewer Delete" });
    const stranger = await createTestUser({ name: "Stranger Delete" });
    const admin = await createAdminUser({ name: "Admin Delete" });

    creatorUserId = creator.user.id;
    reviewerUserId = reviewer.user.id;
    reviewerToken = reviewer.token;
    strangerUserId = stranger.user.id;
    strangerToken = stranger.token;
    adminUserId = admin.user.id;
    adminToken = admin.token;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;

    await createInteraction(reviewerUserId, profileId);
  });

  it("returns 401 if not authenticated", async () => {
    const review = await createReview(reviewerUserId, profileId, {
      comment: COMMENT,
    });

    const req = delReq(review.id); // no token
    const res = await deleteReview(req, delParams(review.id));
    expect(res.status).toBe(401);

    // Cleanup manually since cascade won't fire yet
    await prisma.review.deleteMany({ where: { id: review.id } });
  });

  it("returns 404 if review does not exist", async () => {
    const req = delReq("nonexistent-review-id", reviewerToken);
    const res = await deleteReview(req, delParams("nonexistent-review-id"));
    expect(res.status).toBe(404);
  });

  it("returns 403 if stranger tries to delete", async () => {
    const review = await createReview(reviewerUserId, profileId, {
      comment: COMMENT,
    });

    const req = delReq(review.id, strangerToken);
    const res = await deleteReview(req, delParams(review.id));
    expect(res.status).toBe(403);

    // Cleanup
    await prisma.review.deleteMany({ where: { id: review.id } });
  });

  it("reviewer (author) can delete own review", async () => {
    const review = await createReview(reviewerUserId, profileId, {
      comment: COMMENT,
    });
    const countBefore = await prisma.review.count({
      where: { creatorProfileId: profileId },
    });

    const req = delReq(review.id, reviewerToken);
    const res = await deleteReview(req, delParams(review.id));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toBeDefined();

    const countAfter = await prisma.review.count({
      where: { creatorProfileId: profileId },
    });
    expect(countAfter).toBe(countBefore - 1);
  });

  it("after deletion: CreatorProfile.reviewCount is decremented", async () => {
    // Create then delete a review and check profile stats
    const review = await createReview(reviewerUserId, profileId, {
      rating: 5,
      comment: COMMENT,
    });

    const profileBefore = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { reviewCount: true },
    });

    const req = delReq(review.id, reviewerToken);
    await deleteReview(req, delParams(review.id));

    const profileAfter = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { reviewCount: true },
    });

    expect(profileAfter!.reviewCount).toBe((profileBefore?.reviewCount ?? 1) - 1);
  });

  it("admin can delete any review (not their own)", async () => {
    const review = await createReview(reviewerUserId, profileId, {
      comment: COMMENT,
    });

    const req = delReq(review.id, adminToken);
    const res = await deleteReview(req, delParams(review.id));
    expect(res.status).toBe(200);

    const deleted = await prisma.review.findUnique({ where: { id: review.id } });
    expect(deleted).toBeNull();
  });
});
