import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, buildRequest } from "../../helpers";
import {
  createPublishedProfile,
  createUnpublishedProfile,
  createInteraction,
  deleteUsers,
} from "./fixtures";

import { POST as createReviewHandler } from "@/app/api/creators/[id]/reviews/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let creatorUserId: string;
let visitorUserId: string;
let visitorToken: string;
let visitor2UserId: string;
let visitor2Token: string;
let profileId: string;
let unpublishedProfileId: string;

afterAll(async () => {
  await deleteUsers(creatorUserId, visitorUserId, visitor2UserId);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function postReq(id: string, body: unknown, token?: string) {
  return buildRequest(`/api/creators/${id}/reviews`, {
    method: "POST",
    body,
    token,
  });
}

function postParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_COMMENT = "Отличная работа, всё сдано в срок и качество на высоте!";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/creators/[id]/reviews", () => {
  it("setup: create users, profiles, and contact interactions", async () => {
    const creator = await createTestUser({ name: "Creator User" });
    const visitor = await createTestUser({ name: "Visitor User" });
    const visitor2 = await createTestUser({ name: "Visitor 2" });

    creatorUserId = creator.user.id;
    visitorUserId = visitor.user.id;
    visitorToken = visitor.token;
    visitor2UserId = visitor2.user.id;
    visitor2Token = visitor2.token;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;

    const unpublished = await createUnpublishedProfile(creatorUserId);
    unpublishedProfileId = unpublished.id;

    // visitor has interacted, visitor2 has NOT
    await createInteraction(visitorUserId, profileId);
  });

  // ─── Auth guard ─────────────────────────────────────────────────────────

  it("returns 401 if not authenticated", async () => {
    const req = postReq(profileId, { rating: 5, comment: VALID_COMMENT }); // no token
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(401);
  });

  // ─── Profile checks ─────────────────────────────────────────────────────

  it("returns 404 if profile does not exist", async () => {
    const req = postReq("nonexistent-id", { rating: 5, comment: VALID_COMMENT }, visitorToken);
    const res = await createReviewHandler(req, postParams("nonexistent-id"));
    expect(res.status).toBe(404);
  });

  it("returns 400 if profile is not published", async () => {
    // visitor hasn't clicked on this profile but that's secondary — unpublished check is first
    const req = postReq(
      unpublishedProfileId,
      { rating: 5, comment: VALID_COMMENT },
      visitorToken,
    );
    const res = await createReviewHandler(req, postParams(unpublishedProfileId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/не опубликован/i);
  });

  it("returns 400 if reviewer is profile owner", async () => {
    // Creator tries to review their own profile (need creator token)
    const creator = await createTestUser({ name: "Self-review Creator" });
    const selfProfile = await createPublishedProfile(creator.user.id);
    await createInteraction(creator.user.id, selfProfile.id);

    const req = postReq(selfProfile.id, { rating: 5, comment: VALID_COMMENT }, creator.token);
    const res = await createReviewHandler(req, postParams(selfProfile.id));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/свой/i);

    await deleteUsers(creator.user.id);
  });

  // ─── Contact interaction check ───────────────────────────────────────────

  it("returns 400 if no ContactInteraction exists (visitor2 never clicked)", async () => {
    const req = postReq(profileId, { rating: 5, comment: VALID_COMMENT }, visitor2Token);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/свяжитесь/i);
  });

  // ─── Validation ─────────────────────────────────────────────────────────

  it("returns 400 if rating is missing", async () => {
    const req = postReq(profileId, { comment: VALID_COMMENT }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
  });

  it("returns 400 if rating < 1", async () => {
    const req = postReq(profileId, { rating: 0, comment: VALID_COMMENT }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
  });

  it("returns 400 if rating > 5", async () => {
    const req = postReq(profileId, { rating: 6, comment: VALID_COMMENT }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
  });

  it("returns 400 if comment is shorter than 10 chars", async () => {
    const req = postReq(profileId, { rating: 4, comment: "Ок." }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/10/);
  });

  it("returns 400 if comment exceeds 2000 chars", async () => {
    const longComment = "а".repeat(2001);
    const req = postReq(profileId, { rating: 4, comment: longComment }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2000/);
  });

  // ─── Successful creation ─────────────────────────────────────────────────

  it("creates review with 201 and returns review with reviewer data", async () => {
    const req = postReq(profileId, { rating: 5, comment: VALID_COMMENT }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.rating).toBe(5);
    expect(body.comment).toBe(VALID_COMMENT);
    expect(body.reviewerId).toBe(visitorUserId);
    expect(body.creatorProfileId).toBe(profileId);
    expect(body.reviewer).toBeDefined();
    expect(body.reviewer.id).toBe(visitorUserId);
    expect(body.reply).toBeNull();
  });

  it("updates CreatorProfile.averageRating and reviewCount after creation", async () => {
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { averageRating: true, reviewCount: true },
    });
    expect(profile!.reviewCount).toBe(1);
    expect(profile!.averageRating).toBe(5);
  });

  it("returns 400 on duplicate review attempt (same reviewer → same profile)", async () => {
    // visitor already reviewed in the previous test
    const req = postReq(profileId, { rating: 3, comment: VALID_COMMENT }, visitorToken);
    const res = await createReviewHandler(req, postParams(profileId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/уже оставили/i);
  });
});
