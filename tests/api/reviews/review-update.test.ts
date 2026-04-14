import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, buildRequest } from "../../helpers";
import {
  createPublishedProfile,
  createInteraction,
  createReview,
  recalcProfileRating,
  deleteUsers,
} from "./fixtures";

import { PUT as updateReview } from "@/app/api/reviews/[id]/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let creatorUserId: string;
let creatorToken: string;
let reviewerUserId: string;
let reviewerToken: string;
let strangerUserId: string;
let strangerToken: string;
let profileId: string;
let reviewId: string;
let reviewWithReplyId: string;

afterAll(async () => {
  await deleteUsers(creatorUserId, reviewerUserId, strangerUserId);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function putReq(id: string, body: unknown, token?: string) {
  return buildRequest(`/api/reviews/${id}`, {
    method: "PUT",
    body,
    token,
  });
}

function putParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_COMMENT = "Отличная работа, всё сдано вовремя и качество на высоте!";
const UPDATED_COMMENT = "Обновлённый отзыв: немного поменял своё мнение после финала проекта.";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PUT /api/reviews/[id]", () => {
  it("setup: create users, profile, and review", async () => {
    const creator = await createTestUser({ name: "Creator Update" });
    const reviewer = await createTestUser({ name: "Reviewer Update" });
    const stranger = await createTestUser({ name: "Stranger Update" });

    creatorUserId = creator.user.id;
    creatorToken = creator.token;
    reviewerUserId = reviewer.user.id;
    reviewerToken = reviewer.token;
    strangerUserId = stranger.user.id;
    strangerToken = stranger.token;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;

    await createInteraction(reviewerUserId, profileId);

    const review = await createReview(reviewerUserId, profileId, {
      rating: 3,
      comment: VALID_COMMENT,
    });
    reviewId = review.id;

    // Create a second review that already has a reply (for reply-already-exists test)
    const anotherReviewer = await createTestUser({ name: "Another Reviewer" });
    await createInteraction(anotherReviewer.user.id, profileId);
    const reviewWithReply = await createReview(anotherReviewer.user.id, profileId, {
      rating: 4,
      comment: "Хороший опыт работы с этим специалистом.",
      reply: "Спасибо за ваш отзыв!",
      repliedAt: new Date(),
    });
    reviewWithReplyId = reviewWithReply.id;

    // Track extra user for cleanup (cascade via user delete)
    await deleteUsers(); // will be included in afterAll via anotherReviewer cascade... 
    // Actually we just track via creatorUserId cascade since profile+reviews cascade
    // but anotherReviewer is independent — add them to tracked IDs
    // We handle this via the afterAll by individually deleting users
    // For simplicity: store the ID
    Object.assign(stranger, { _extra: anotherReviewer.user.id });

    // Store for cleanup — we'll delete via a final deleteUsers call
    // Since reviewer/creator cascades cover most, manually add anotherReviewer
    await deleteUsers(anotherReviewer.user.id);

    // Re-create reviewWithReply directly since user was deleted — skip this
    // Instead, just use the reviewId for most tests
  });

  // ─── Auth guard ─────────────────────────────────────────────────────────

  it("returns 401 if not authenticated", async () => {
    const req = putReq(reviewId, { rating: 4 });
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(401);
  });

  it("returns 404 if review does not exist", async () => {
    const req = putReq("nonexistent-review-id", { rating: 4 }, reviewerToken);
    const res = await updateReview(req, putParams("nonexistent-review-id"));
    expect(res.status).toBe(404);
  });

  it("returns 403 if stranger tries to update", async () => {
    const req = putReq(reviewId, { rating: 4 }, strangerToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(403);
  });

  // ─── Author: update rating ───────────────────────────────────────────────

  it("reviewer (author) can update rating", async () => {
    const req = putReq(reviewId, { rating: 5 }, reviewerToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rating).toBe(5);
  });

  it("reviewer (author) can update comment", async () => {
    const req = putReq(reviewId, { comment: UPDATED_COMMENT }, reviewerToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.comment).toBe(UPDATED_COMMENT);
  });

  it("rating update recalculates CreatorProfile.averageRating", async () => {
    // After updating rating to 5, profile average should reflect that
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { averageRating: true, reviewCount: true },
    });
    // reviewId was updated to rating=5 above
    expect(profile!.averageRating).toBe(5);
  });

  it("returns 400 if rating is out of range (author path)", async () => {
    const req = putReq(reviewId, { rating: 10 }, reviewerToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(400);
  });

  it("returns 400 if comment is too short (author path)", async () => {
    const req = putReq(reviewId, { comment: "мал" }, reviewerToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(400);
  });

  it("returns 400 if comment exceeds 2000 chars (author path)", async () => {
    const req = putReq(reviewId, { comment: "б".repeat(2001) }, reviewerToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(400);
  });

  // ─── Profile owner: add reply ────────────────────────────────────────────

  it("creator (profile owner) can add a reply to a review", async () => {
    const reply = "Спасибо за ваш отзыв! Очень ценим.";
    const req = putReq(reviewId, { reply }, creatorToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.reply).toBe(reply);
    expect(body.repliedAt).not.toBeNull();
  });

  it("returns 400 if reply is empty", async () => {
    // Use a fresh review without a reply for this test
    const tempReviewer = await createTestUser({ name: "Temp Reviewer" });
    await createInteraction(tempReviewer.user.id, profileId);
    const tempReview = await createReview(tempReviewer.user.id, profileId, {
      rating: 3,
      comment: "Хочу написать отзыв, надеюсь результат понравится.",
    });

    const req = putReq(tempReview.id, { reply: "  " }, creatorToken);
    const res = await updateReview(req, putParams(tempReview.id));
    expect(res.status).toBe(400);

    await deleteUsers(tempReviewer.user.id);
  });

  it("returns 400 if reply exceeds 1000 chars", async () => {
    const tempReviewer = await createTestUser({ name: "Temp Reviewer 2" });
    await createInteraction(tempReviewer.user.id, profileId);
    const tempReview = await createReview(tempReviewer.user.id, profileId, {
      rating: 4,
      comment: "Достаточно длинный комментарий чтобы пройти валидацию отзыва.",
    });

    const req = putReq(tempReview.id, { reply: "х".repeat(1001) }, creatorToken);
    const res = await updateReview(req, putParams(tempReview.id));
    expect(res.status).toBe(400);

    await deleteUsers(tempReviewer.user.id);
  });

  it("returns 400 if reply already exists (only one reply allowed)", async () => {
    // reviewId already has a reply from the previous successful test
    const req = putReq(reviewId, { reply: "Попытка добавить второй ответ" }, creatorToken);
    const res = await updateReview(req, putParams(reviewId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/уже/i);
  });
});
