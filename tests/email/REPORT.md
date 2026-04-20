# Email tests report

_Generated: 2026-04-19T22:35:59.423Z_

**Summary:** 29 pass · 0 fail · 0 skip · total 3713 ms

## tests/email/account.test.ts

| # | Сценарий | Статус | Время |
|---|---|---|---|
| 1 | Email · Account > block=true → sendAccountBlockedEmail + user.blocked=true | ✓ pass | 31 ms |
| 2 | Email · Account > block=false (разблок) → sendAccountUnblockedEmail | ✓ pass | 14 ms |
| 3 | Email · Account > block без изменения (уже заблокирован) → письмо НЕ отправляется повторно | ✓ pass | 90 ms |

## tests/email/admin.test.ts

| # | Сценарий | Статус | Время |
|---|---|---|---|
| 1 | Email · Admin alerts > withdraw → sendAdminWithdrawalRequestEmail с суммой и requestId | ✓ pass | 72 ms |
| 2 | Email · Admin alerts > report → sendAdminReportEmail с targetType/targetId/reason | ✓ pass | 28 ms |
| 3 | Email · Admin alerts > appeal submit → sendAdminAppealEmail с причиной | ✓ pass | 56 ms |
| 4 | Email · Admin alerts > task apply → sendApplicationEmail владельцу задания | ✓ pass | 44 ms |

## tests/email/auth.test.ts

| # | Сценарий | Статус | Время |
|---|---|---|---|
| 1 | Email · Auth > register → sendVerificationCode с 6-значным кодом | ✓ pass | 352 ms |
| 2 | Email · Auth > verify-email → sendWelcomeEmail после первой верификации | ✓ pass | 228 ms |
| 3 | Email · Auth > forgot-password → sendPasswordResetEmail с ссылкой, содержащей token | ✓ pass | 13 ms |
| 4 | Email · Auth > reset-password → sendPasswordChangedEmail после успешной смены | ✓ pass | 214 ms |
| 5 | Email · Auth > change-password → sendPasswordChangedEmail в кабинете | ✓ pass | 214 ms |
| 6 | Email · Auth > change-email → sendEmailChangeCode на НОВЫЙ email | ✓ pass | 10 ms |
| 7 | Email · Auth > новое устройство при createSession → sendNewDeviceLoginEmail | ✓ pass | 173 ms |

## tests/email/cron.test.ts

| # | Сценарий | Статус | Время |
|---|---|---|---|
| 1 | Email · Cron > expiring 24h → sendAdExpiringEmail + флаг expiryReminderSentAt | ✓ pass | 192 ms |
| 2 | Email · Cron > budget_exhausted → sendBudgetExhaustedEmail + ad.status=budget_exhausted | ✓ pass | 31 ms |
| 3 | Email · Cron > SLA escalated → sendAdminSlaEscalationEmail со списком | ✓ pass | 33 ms |

## tests/email/moderation.test.ts

| # | Сценарий | Статус | Время |
|---|---|---|---|
| 1 | Email · Moderation > approve → sendSubmissionApprovedEmail c approvedViews/payoutAmount | ✓ pass | 122 ms |
| 2 | Email · Moderation > reject (no_brand) → sendSubmissionRejectedEmail с canAppeal=true | ✓ pass | 47 ms |
| 3 | Email · Moderation > reject (fake_stats) → canAppeal=false (permanent reason) | ✓ pass | 41 ms |
| 4 | Email · Moderation > appeal resolve (approved) → sendAppealResolvedEmail + submission → submitted | ✓ pass | 27 ms |

## tests/email/payments.test.ts

| # | Сценарий | Статус | Время |
|---|---|---|---|
| 1 | Email · Payment receipts > ad_publication → receipt с entityId ad | ✓ pass | 85 ms |
| 2 | Email · Payment receipts > creator_publication → receipt с entityId profile | ✓ pass | 34 ms |
| 3 | Email · Payment receipts > escrow_deposit → receipt + создан EscrowAccount | ✓ pass | 30 ms |
| 4 | Email · Payment receipts > escrow_topup → receipt + баланс увеличен | ✓ pass | 40 ms |
| 5 | Email · Payment receipts > wallet_topup → receipt + creatorBalance пополнен | ✓ pass | 14 ms |
| 6 | Email · Payment receipts > ad_boost → receipt c entityId=ad | ✓ pass | 42 ms |
| 7 | Email · Payment receipts > creator_boost → receipt c entityId=profile | ✓ pass | 34 ms |
| 8 | Email · Payment receipts > оплата не success → receipt НЕ отправлен | ✓ pass | 98 ms |

