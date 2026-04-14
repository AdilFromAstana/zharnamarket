import { describe, it, expect, afterAll } from "vitest";
import { createTestUser, buildRequest } from "../../helpers";
import {
  createPublishedProfile,
  createInteraction,
  createReview,
  deleteUsers,
} from "./fixtures";

import { GET as eligibility } from "@/app/api/reviews/eligibility/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let creatorUserId: string;
let creatorToken: string;
let visitorUserId: string;
let visitorToken: string;
let visitor2UserId: string;
let visitor2Token: string;
let visitor3UserId: string;
let visitor3Token: string;
let profileId: string;

afterAll(async () => {
  await deleteUsers(creatorUserId, visitorUserId, visitor2UserId, visitor3UserId);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eligReq(creatorProfileId: string, token?: string) {
  return buildRequest(
    `/api/reviews/eligibility?creatorProfileId=${creatorProfileId}`,
    { token },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/reviews/eligibility", () => {
  it("setup: create users and profile", async () => {
    const creator = await createTestUser({ name: "Creator Eligibility" });
    const visitor = await createTestUser({ name: "Visitor Eligible" });
    const visitor2 = await createTestUser({ name: "Visitor Already Reviewed" });
    const visitor3 = await createTestUser({ name: "Visitor No Interaction" });

    creatorUserId = creator.user.id;
    creatorToken = creator.token;
    visitorUserId = visitor.user.id;
    visitorToken = visitor.token;
    visitor2UserId = visitor2.user.id;
    visitor2Token = visitor2.token;
    visitor3UserId = visitor3.user.id;
    visitor3Token = visitor3.token;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;

    // visitor: has interaction, no review yet → will be eligible
    await createInteraction(visitorUserId, profileId);

    // visitor2: has interaction + already reviewed → not eligible
    await createInteraction(visitor2UserId, profileId);
    await createReview(visitor2UserId, profileId, {
      comment: "Уже оставил отзыв, больше не нужен.",
    });

    // visitor3: no interaction → not eligible
    // (nothing needed)
  });

  it("returns 401 if not authenticated", async () => {
    const req = eligReq(profileId); // no token
    const res = await eligibility(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if creatorProfileId is missing", async () => {
    const req = buildRequest("/api/reviews/eligibility", { token: visitorToken });
    const res = await eligibility(req);
    expect(res.status).toBe(400);
  });

  it("eligible=false when profile does not exist", async () => {
    const req = eligReq("nonexistent-profile-id", visitorToken);
    const res = await eligibility(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eligible).toBe(false);
    expect(body.reason).toBeDefined();
  });

  it("eligible=false when user is the profile owner", async () => {
    const req = eligReq(profileId, creatorToken);
    const res = await eligibility(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eligible).toBe(false);
    expect(body.reason).toMatch(/свой/i);
  });

  it("eligible=false when no ContactInteraction exists", async () => {
    const req = eligReq(profileId, visitor3Token);
    const res = await eligibility(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eligible).toBe(false);
    expect(body.hasInteraction).toBe(false);
    expect(body.hasExistingReview).toBe(false);
    expect(body.reason).toMatch(/свяжитесь/i);
  });

  it("eligible=false when review already exists (hasExistingReview=true)", async () => {
    const req = eligReq(profileId, visitor2Token);
    const res = await eligibility(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eligible).toBe(false);
    expect(body.hasExistingReview).toBe(true);
    expect(body.reason).toMatch(/уже оставили/i);
  });

  it("eligible=true when interaction exists and no review yet", async () => {
    const req = eligReq(profileId, visitorToken);
    const res = await eligibility(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.eligible).toBe(true);
    expect(body.hasInteraction).toBe(true);
    expect(body.hasExistingReview).toBe(false);
    expect(body.reason).toBeUndefined();
  });
});
