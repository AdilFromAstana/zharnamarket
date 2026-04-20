import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BoostType } from "@prisma/client";
import { shouldRaise, RAISE_PRIORITY } from "@/lib/boost";
import {
  sendAdExpiringEmail,
  sendBudgetExhaustedEmail,
  sendAdminSlaEscalationEmail,
} from "@/lib/email";

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

    // 2. AdBoost: истёкшие НЕ удаляем (сохраняем историю для аналитики и аудита).
    // Фильтры по `expiresAt > now` в запросах уже корректно исключают их из активных.

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

    // 2b. CreatorBoost: истёкшие НЕ удаляем (сохраняем историю).

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

    // 3b. Напоминание за ~24ч до истечения.
    // Окно [now+23ч, now+25ч] + флаг expiryReminderSentAt=null гарантируют
    // идемпотентность: при любой частоте cron ≤ 2ч письмо уйдёт ровно один раз.
    const reminderWindowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const expiringAds = await prisma.ad.findMany({
      where: {
        status: "active",
        expiresAt: { gte: reminderWindowStart, lte: reminderWindowEnd },
        expiryReminderSentAt: null,
      },
      select: {
        id: true,
        title: true,
        expiresAt: true,
        owner: { select: { email: true } },
      },
    });

    let expiryRemindersSent = 0;
    for (const ad of expiringAds) {
      if (!ad.owner?.email || !ad.expiresAt) continue;
      try {
        await sendAdExpiringEmail(ad.owner.email, {
          adTitle: ad.title,
          adId: ad.id,
          expiresAt: ad.expiresAt,
        });
        await prisma.ad.update({
          where: { id: ad.id },
          data: { expiryReminderSentAt: new Date() },
        });
        expiryRemindersSent++;
      } catch (err) {
        // Письмо не ушло — флаг не ставим, повторится на следующем тике.
        console.error("[Cron] expiring-email failed for ad", ad.id, err);
      }
    }

    // 4. VideoSubmission: SLA escalation (submitted > 24h).
    // Сначала читаем кого эскалировать — нужно для сводного письма админу,
    // потом одним апдейтом помечаем escalated. Если письмо не ушло — ничего
    // страшного: флаг уже стоит, повторного спама не будет.
    const toEscalate = await prisma.videoSubmission.findMany({
      where: {
        status: "submitted",
        slaDeadline: { lt: now },
        escalated: false,
      },
      select: {
        id: true,
        ad: { select: { title: true } },
        creator: { select: { email: true } },
      },
    });

    let escalatedCount = 0;
    if (toEscalate.length > 0) {
      const updated = await prisma.videoSubmission.updateMany({
        where: { id: { in: toEscalate.map((s) => s.id) } },
        data: { escalated: true },
      });
      escalatedCount = updated.count;

      try {
        await sendAdminSlaEscalationEmail({
          escalatedCount,
          items: toEscalate.map((s) => ({
            submissionId: s.id,
            taskTitle: s.ad?.title ?? "(без названия)",
            creatorEmail: s.creator?.email ?? "(нет email)",
          })),
        });
      } catch (err) {
        console.error("[Cron] SLA-admin email failed:", err);
      }
    }

    // 5. Escrow ads: budget_exhausted check.
    // Loop вместо updateMany: нужно знать переход «active → budget_exhausted»
    // per-ad, чтобы послать владельцу ровно одно письмо, и только в момент перехода.
    const exhaustedEscrows = await prisma.escrowAccount.findMany({
      where: {
        status: "active",
        available: { lte: 0 },
        reservedAmount: { lte: 0 },
      },
      select: {
        adId: true,
        ad: { select: { title: true, status: true, owner: { select: { email: true } } } },
      },
    });

    let exhaustedAdsCount = 0;
    for (const esc of exhaustedEscrows) {
      if (esc.ad?.status !== "active") {
        // Объявление уже не active — просто чиним escrow-статус, письма нет.
        await prisma.escrowAccount.updateMany({
          where: { adId: esc.adId, status: "active" },
          data: { status: "exhausted" },
        });
        continue;
      }
      await prisma.ad.update({
        where: { id: esc.adId },
        data: { status: "budget_exhausted" },
      });
      await prisma.escrowAccount.updateMany({
        where: { adId: esc.adId, status: "active" },
        data: { status: "exhausted" },
      });
      exhaustedAdsCount++;

      if (esc.ad.owner?.email) {
        try {
          await sendBudgetExhaustedEmail(esc.ad.owner.email, {
            adTitle: esc.ad.title,
            adId: esc.adId,
          });
        } catch (err) {
          console.error("[Cron] budget-exhausted email failed for ad", esc.adId, err);
        }
      }
    }

    // 6. Escrow ads: block submissions past deadline
    // (handled at submission time, no cron needed)

    const result = {
      ok: true,
      timestamp: now.toISOString(),
      expiredAds: expiredAds.count,
      raisedAds: raisedAdsCount,
      raisedCreators: raisedCreatorsCount,
      deletedSessions: deletedSessions.count,
      expiryRemindersSent,
      escalatedSubmissions: escalatedCount,
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
