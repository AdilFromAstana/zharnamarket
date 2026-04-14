import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BoostType } from "@prisma/client";
import { shouldRaise, RAISE_PRIORITY } from "@/lib/boost";

/**
 * GET /api/cron/expire — авто-истечение объявлений, очистка бустов и сессий.
 *
 * Защита: CRON_SECRET env-переменная. Передаётся через:
 *   - Authorization: Bearer <secret>
 *   - ?secret=<secret>
 *
 * Вызывать по расписанию каждые 5-15 минут (cron-job.org, Vercel Cron, Docker cron).
 */
export async function GET(req: NextRequest) {
  // Проверяем секрет
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const querySecret = new URL(req.url).searchParams.get("secret");
  const providedSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : querySecret;

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Ads: active → expired если expiresAt < now
    const expiredAds = await prisma.ad.updateMany({
      where: {
        status: "active",
        expiresAt: { lt: now, not: null },
      },
      data: { status: "expired" },
    });

    // 2. AdBoost: удаляем истёкшие записи
    const deletedBoosts = await prisma.adBoost.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 2.5. Периодический подъём бустованных объявлений
    // Находим все объявления с ещё активными бустами
    const allActiveBoosts = await prisma.adBoost.findMany({
      where: { expiresAt: { gte: now } },
      select: {
        adId: true,
        boostType: true,
        ad: { select: { raisedAt: true } },
      },
    });

    // Группируем по adId — берём буст с наивысшим приоритетом на объявление
    const adBoostMap = new Map<
      string,
      { boostType: BoostType; raisedAt: Date | null }
    >();
    for (const b of allActiveBoosts) {
      const existing = adBoostMap.get(b.adId);
      if (
        !existing ||
        RAISE_PRIORITY[b.boostType] > RAISE_PRIORITY[existing.boostType]
      ) {
        adBoostMap.set(b.adId, {
          boostType: b.boostType,
          raisedAt: b.ad.raisedAt,
        });
      }
    }

    // Поднимаем объявления, у которых прошёл интервал с последнего подъёма
    let raisedAdsCount = 0;
    for (const [adId, { boostType, raisedAt }] of adBoostMap) {
      if (shouldRaise(raisedAt, boostType, now)) {
        await prisma.ad.update({
          where: { id: adId },
          data: { raisedAt: now },
        });
        raisedAdsCount++;
      }
    }

    // 2b. CreatorBoost: удаляем истёкшие записи
    const deletedCreatorBoosts = await prisma.creatorBoost.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 2c. Периодический подъём бустованных профилей креаторов
    const allActiveCreatorBoosts = await prisma.creatorBoost.findMany({
      where: { expiresAt: { gte: now } },
      select: {
        creatorProfileId: true,
        boostType: true,
        profile: { select: { raisedAt: true } },
      },
    });

    // Группируем по creatorProfileId — берём буст с наивысшим приоритетом
    const creatorBoostMap = new Map<
      string,
      { boostType: BoostType; raisedAt: Date | null }
    >();
    for (const b of allActiveCreatorBoosts) {
      const existing = creatorBoostMap.get(b.creatorProfileId);
      if (
        !existing ||
        RAISE_PRIORITY[b.boostType] > RAISE_PRIORITY[existing.boostType]
      ) {
        creatorBoostMap.set(b.creatorProfileId, {
          boostType: b.boostType,
          raisedAt: b.profile.raisedAt,
        });
      }
    }

    // Поднимаем профили, у которых прошёл интервал с последнего подъёма
    let raisedCreatorsCount = 0;
    for (const [profileId, { boostType, raisedAt }] of creatorBoostMap) {
      if (shouldRaise(raisedAt, boostType, now)) {
        await prisma.creatorProfile.update({
          where: { id: profileId },
          data: { raisedAt: now },
        });
        raisedCreatorsCount++;
      }
    }

    // 3. Sessions: удаляем истёкшие
    const deletedSessions = await prisma.session.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 4. VideoSubmission: SLA escalation (submitted > 24h)
    const escalatedSubmissions = await prisma.videoSubmission.updateMany({
      where: {
        status: "submitted",
        slaDeadline: { lt: now },
        escalated: false,
      },
      data: { escalated: true },
    });

    // 5. Escrow ads: budget_exhausted check
    const exhaustedEscrows = await prisma.escrowAccount.findMany({
      where: {
        status: "active",
        available: { lte: 0 },
        reservedAmount: { lte: 0 },
      },
      select: { adId: true },
    });

    let exhaustedAdsCount = 0;
    if (exhaustedEscrows.length > 0) {
      const exhaustedAdIds = exhaustedEscrows.map((e) => e.adId);
      const updated = await prisma.ad.updateMany({
        where: { id: { in: exhaustedAdIds }, status: "active" },
        data: { status: "budget_exhausted" },
      });
      exhaustedAdsCount = updated.count;

      await prisma.escrowAccount.updateMany({
        where: { adId: { in: exhaustedAdIds }, status: "active" },
        data: { status: "exhausted" },
      });
    }

    // 6. Escrow ads: block submissions past deadline
    // (handled at submission time, no cron needed)

    const result = {
      ok: true,
      timestamp: now.toISOString(),
      expiredAds: expiredAds.count,
      deletedBoosts: deletedBoosts.count,
      raisedAds: raisedAdsCount,
      deletedCreatorBoosts: deletedCreatorBoosts.count,
      raisedCreators: raisedCreatorsCount,
      deletedSessions: deletedSessions.count,
      escalatedSubmissions: escalatedSubmissions.count,
      exhaustedAds: exhaustedAdsCount,
    };

    console.log("[Cron] Expire run:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/cron/expire]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
