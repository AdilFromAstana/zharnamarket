import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, buildRequest } from "../../helpers";
import { createPublishedProfile, deleteUsers } from "./fixtures";

import { POST as contactClick } from "@/app/api/creators/[id]/contact-click/route";

// ─── Shared state ─────────────────────────────────────────────────────────────
let visitorUserId: string;
let visitorToken: string;
let creatorUserId: string;
let profileId: string;

afterAll(async () => {
  await deleteUsers(visitorUserId, creatorUserId);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clickReq(id: string, token?: string) {
  return buildRequest(`/api/creators/${id}/contact-click`, {
    method: "POST",
    token,
  });
}

function clickParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/creators/[id]/contact-click", () => {
  it("setup: create users and published profile", async () => {
    const visitor = await createTestUser({ name: "Visitor" });
    const creator = await createTestUser({ name: "Creator Owner" });

    visitorUserId = visitor.user.id;
    visitorToken = visitor.token;
    creatorUserId = creator.user.id;

    const profile = await createPublishedProfile(creatorUserId);
    profileId = profile.id;
  });

  it("anonymous click: increments contactClickCount, no ContactInteraction created", async () => {
    const before = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { contactClickCount: true },
    });

    const req = clickReq(profileId); // no token
    const res = await contactClick(req, clickParams(profileId));
    expect(res.status).toBe(200);

    const after = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { contactClickCount: true },
    });
    expect(after!.contactClickCount).toBe((before?.contactClickCount ?? 0) + 1);

    // No interaction should be created for anonymous user
    const interactions = await prisma.contactInteraction.count({
      where: { creatorProfileId: profileId },
    });
    expect(interactions).toBe(0);
  });

  it("auth visitor click: increments count AND creates ContactInteraction", async () => {
    const before = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { contactClickCount: true },
    });

    const req = clickReq(profileId, visitorToken);
    const res = await contactClick(req, clickParams(profileId));
    expect(res.status).toBe(200);

    // Counter incremented
    const after = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: { contactClickCount: true },
    });
    expect(after!.contactClickCount).toBe((before?.contactClickCount ?? 0) + 1);

    // ContactInteraction created
    const interaction = await prisma.contactInteraction.findUnique({
      where: {
        userId_creatorProfileId: { userId: visitorUserId, creatorProfileId: profileId },
      },
    });
    expect(interaction).not.toBeNull();
  });

  it("auth owner click: increments count but does NOT create ContactInteraction for self", async () => {
    // creatorToken = owner of the profile
    const creator = await createTestUser({ name: "Creator Self Click" });
    const ownProfile = await createPublishedProfile(creator.user.id);

    const req = clickReq(ownProfile.id, creator.token);
    const res = await contactClick(req, clickParams(ownProfile.id));
    expect(res.status).toBe(200);

    // No self-interaction
    const interaction = await prisma.contactInteraction.findUnique({
      where: {
        userId_creatorProfileId: { userId: creator.user.id, creatorProfileId: ownProfile.id },
      },
    });
    expect(interaction).toBeNull();

    // Cleanup
    await deleteUsers(creator.user.id);
  });

  it("repeated auth click: upserts ContactInteraction (no duplicate error)", async () => {
    // Already created in previous test — click again
    const req = clickReq(profileId, visitorToken);
    const res = await contactClick(req, clickParams(profileId));
    expect(res.status).toBe(200);

    // Still exactly 1 interaction (upsert)
    const count = await prisma.contactInteraction.count({
      where: {
        userId: visitorUserId,
        creatorProfileId: profileId,
      },
    });
    expect(count).toBe(1);
  });

  it("non-existent profile: returns 200 (updateMany is safe, no-op)", async () => {
    const req = clickReq("nonexistent-profile-id");
    const res = await contactClick(req, clickParams("nonexistent-profile-id"));
    expect(res.status).toBe(200);
  });

  it("returns { ok: true } in response body", async () => {
    const req = clickReq(profileId);
    const res = await contactClick(req, clickParams(profileId));
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
