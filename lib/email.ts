import nodemailer from "nodemailer";

/**
 * Email-сервис для отправки transactional-писем.
 * Использует Nodemailer + SMTP.
 *
 * Env-переменные:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP not configured — emails will be logged to console");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

let _transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter === undefined) {
    _transporter = createTransporter();
  }
  return _transporter;
}

const FROM = () => process.env.SMTP_FROM ?? '"Zharnamarket" <noreply@zharnamarket.kz>';

/**
 * Отправляет email для сброса пароля.
 * Если SMTP не настроен — логирует в console (для разработки).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const transporter = getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #2563eb); line-height: 48px; color: white; font-weight: bold; font-size: 20px;">Z</div>
      </div>
      <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Сброс пароля</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Вы запросили сброс пароля для аккаунта Zharnamarket. Нажмите кнопку ниже, чтобы установить новый пароль.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Установить новый пароль
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
        Ссылка действительна <strong>1 час</strong>. Если вы не запрашивали сброс пароля — проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">
        Zharnamarket — маркетплейс для бизнеса и креаторов
      </p>
    </div>
  `;

  if (!transporter) {
    if (process.env.NODE_ENV === "production") {
      // SMTP ещё не настроен на проде — не роняем приложение, просто
      // логируем warning. Юзер получает тот же UX ("проверьте почту"),
      // но реальное письмо не уходит. Токен доступен в БД.
      console.warn(
        "[Email] SMTP не настроен в production — письмо сброса пароля " +
          `для ${to} не отправлено. Токен — в таблице PasswordResetToken.`,
      );
      return;
    }
    // Dev mode: token маскируем, чтобы не засорять shared-логи
    const maskedUrl = resetUrl.replace(/token=([^&]+)/, "token=<REDACTED>");
    console.log("\n[Email] Password reset email (SMTP not configured):");
    console.log(`  To: ${to}`);
    console.log(`  Reset URL: ${maskedUrl}`);
    console.log("  (токен смотрите в БД таблица PasswordResetToken)");
    console.log("");
    return;
  }

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: "Сброс пароля — Zharnamarket",
    html,
  });
}

/**
 * Отправляет 6-значный код подтверждения email.
 * Если SMTP не настроен — логирует в console (для разработки).
 */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<void> {
  const transporter = getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #2563eb); line-height: 48px; color: white; font-weight: bold; font-size: 20px;">Z</div>
      </div>
      <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Подтверждение email</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
        Введите этот код на странице подтверждения, чтобы завершить регистрацию.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #111827; font-family: 'Courier New', monospace;">
          ${code}
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
        Код действителен <strong>15 минут</strong>. Если вы не регистрировались на Zharnamarket — проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">
        Zharnamarket — маркетплейс для бизнеса и креаторов
      </p>
    </div>
  `;

  if (!transporter) {
    if (process.env.NODE_ENV === "production") {
      // Прод без SMTP: код не отправляется, но в логах виден,
      // чтобы админ мог вручную прочитать и переслать (bootstrap-режим).
      console.warn(
        `[Email] SMTP не настроен в production — verification code для ${to}: ${code}`,
      );
      return;
    }
    console.log("\n[Email] Verification code (SMTP not configured):");
    console.log(`  To: ${to}`);
    console.log(`  Code: ${code}`);
    console.log("");
    return;
  }

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `${code} — Код подтверждения Zharnamarket`,
    html,
  });
}

function wrapHtml(inner: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #2563eb); line-height: 48px; color: white; font-weight: bold; font-size: 20px;">Z</div>
      </div>
      ${inner}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">
        Zharnamarket — маркетплейс для бизнеса и креаторов
      </p>
    </div>
  `;
}

async function deliver(to: string, subject: string, html: string, consoleTag: string) {
  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[Email] SMTP не настроен в production — "${consoleTag}" для ${to} не отправлено`,
      );
      return;
    }
    console.log(`\n[Email] ${consoleTag} (SMTP not configured):`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log("");
    return;
  }
  await transporter.sendMail({ from: FROM(), to, subject, html });
}

/**
 * Уведомление владельцу задания: на задание откликнулся креатор.
 */
export async function sendApplicationEmail(
  to: string,
  params: { taskTitle: string; taskId: string; creatorName: string },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const taskUrl = `${appUrl}/ads/${params.taskId}`;
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Новый отклик на задание</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Креатор <strong>${escapeHtml(params.creatorName)}</strong> откликнулся на ваше задание:
    </p>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 24px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
      ${escapeHtml(params.taskTitle)}
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${taskUrl}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Посмотреть отклик
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
      Отключить такие уведомления можно в настройках профиля.
    </p>
  `;
  await deliver(to, `Новый отклик на задание «${params.taskTitle}»`, wrapHtml(inner), "Task application");
}

/**
 * Уведомление о входе с нового устройства.
 */
export async function sendNewDeviceLoginEmail(
  to: string,
  params: {
    device: string | null;
    os: string | null;
    browser: string | null;
    ip: string | null;
    at: Date;
  },
): Promise<void> {
  const deviceLine = [params.device, params.os, params.browser].filter(Boolean).join(" · ") || "Неизвестное устройство";
  const whenLine = params.at.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Вход с нового устройства</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      В ваш аккаунт выполнен вход с устройства, которое мы раньше не видели:
    </p>
    <div style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Устройство:</strong> ${escapeHtml(deviceLine)}</div>
      ${params.ip ? `<div><strong>IP:</strong> ${escapeHtml(params.ip)}</div>` : ""}
      <div><strong>Время:</strong> ${escapeHtml(whenLine)}</div>
    </div>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Если это были вы — всё в порядке. Если нет — сразу смените пароль и завершите чужие сессии.
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/cabinet/settings" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть настройки безопасности
      </a>
    </div>
  `;
  await deliver(to, "Вход с нового устройства — Zharnamarket", wrapHtml(inner), "New device login");
}

/**
 * Подтверждение: пароль был успешно изменён (через сброс или смену).
 */
export async function sendPasswordChangedEmail(to: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Пароль изменён</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Пароль от вашего аккаунта Zharnamarket был успешно изменён. Все другие сессии были завершены.
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      Если это были не вы — восстановите доступ через «Забыли пароль?» и обратитесь в поддержку.
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/auth/login" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Войти в аккаунт
      </a>
    </div>
  `;
  await deliver(to, "Пароль изменён — Zharnamarket", wrapHtml(inner), "Password changed");
}

/**
 * Код подтверждения для смены email.
 */
export async function sendEmailChangeCode(
  to: string,
  code: string,
): Promise<void> {
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Смена email</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
      Вы запросили смену email. Введите код ниже, чтобы подтвердить новый адрес.
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #111827; font-family: 'Courier New', monospace;">
        ${code}
      </div>
    </div>
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
      Код действителен <strong>15 минут</strong>. Если вы не запрашивали смену email — проигнорируйте это письмо.
    </p>
  `;
  await deliver(to, `${code} — Смена email Zharnamarket`, wrapHtml(inner), "Email change code");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Admin helpers ──────────────────────────────────────────────────────────
// Адрес админа для алертов задаётся через `ADMIN_EMAIL` env-переменную.
// Если не настроено — алерт проглатывается с warning-ом (не роняем поток).

function getAdminEmail(): string | null {
  const v = process.env.ADMIN_EMAIL?.trim();
  return v ? v : null;
}

async function sendAdminEmail(
  subject: string,
  innerHtml: string,
  consoleTag: string,
): Promise<void> {
  const to = getAdminEmail();
  if (!to) {
    console.warn(`[Email][${consoleTag}] ADMIN_EMAIL не настроен — алерт не отправлен`);
    return;
  }
  await deliver(to, subject, wrapHtml(innerHtml), consoleTag);
}

// ─── Payment receipts ───────────────────────────────────────────────────────

export type PaymentReceiptType =
  | "ad_publication"
  | "creator_publication"
  | "escrow_deposit"
  | "escrow_topup"
  | "wallet_topup"
  | "ad_boost"
  | "creator_boost";

const RECEIPT_LABELS: Record<PaymentReceiptType, { title: string; subject: string }> = {
  ad_publication: {
    title: "Объявление опубликовано",
    subject: "Оплата принята — объявление опубликовано",
  },
  creator_publication: {
    title: "Профиль креатора опубликован",
    subject: "Оплата принята — профиль опубликован",
  },
  escrow_deposit: {
    title: "Эскроу-бюджет создан",
    subject: "Оплата принята — эскроу-бюджет активен",
  },
  escrow_topup: {
    title: "Эскроу-бюджет пополнен",
    subject: "Оплата принята — эскроу пополнен",
  },
  wallet_topup: {
    title: "Кошелёк пополнен",
    subject: "Оплата принята — кошелёк пополнен",
  },
  ad_boost: {
    title: "Буст объявления активирован",
    subject: "Оплата принята — буст объявления активен",
  },
  creator_boost: {
    title: "Буст профиля активирован",
    subject: "Оплата принята — буст профиля активен",
  },
};

/**
 * Чек об успешной оплате. Вызывается после коммита транзакции в webhook-handler.
 */
export async function sendPaymentReceiptEmail(
  to: string,
  params: {
    type: PaymentReceiptType;
    amount: number;
    entityTitle?: string;
    entityId?: string;
  },
): Promise<void> {
  const { type, amount, entityTitle, entityId } = params;
  const label = RECEIPT_LABELS[type];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const amountFmt = amount.toLocaleString("ru-RU");

  let ctaUrl: string | null = null;
  let ctaText = "Открыть кабинет";
  if (type === "ad_publication" || type === "escrow_deposit" || type === "escrow_topup" || type === "ad_boost") {
    if (entityId) {
      ctaUrl = `${appUrl}/ads/${entityId}`;
      ctaText = "Посмотреть объявление";
    } else {
      ctaUrl = `${appUrl}/ads/manage`;
      ctaText = "Мои объявления";
    }
  } else if (type === "creator_publication" || type === "creator_boost") {
    if (entityId) {
      ctaUrl = `${appUrl}/creators/${entityId}`;
      ctaText = "Посмотреть профиль";
    } else {
      ctaUrl = `${appUrl}/creators/manage`;
      ctaText = "Мои профили";
    }
  } else if (type === "wallet_topup") {
    ctaUrl = `${appUrl}/cabinet/balance`;
    ctaText = "Открыть кошелёк";
  }

  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">${escapeHtml(label.title)}</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Оплата успешно принята.
    </p>
    <div style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Сумма:</strong> ${escapeHtml(amountFmt)} ₸</div>
      ${entityTitle ? `<div><strong>Позиция:</strong> ${escapeHtml(entityTitle)}</div>` : ""}
    </div>
    ${
      ctaUrl
        ? `<div style="text-align: center; margin-bottom: 16px;">
             <a href="${ctaUrl}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
               ${escapeHtml(ctaText)}
             </a>
           </div>`
        : ""
    }
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
      Это автоматическое подтверждение — отвечать на него не нужно.
    </p>
  `;
  await deliver(to, label.subject, wrapHtml(inner), `Payment receipt (${type})`);
}

// ─── Welcome ────────────────────────────────────────────────────────────────

/**
 * Приветственное письмо после первой успешной верификации email.
 */
export async function sendWelcomeEmail(
  to: string,
  params: { name?: string | null } = {},
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const greeting = params.name?.trim()
    ? `Здравствуйте, ${escapeHtml(params.name.trim())}!`
    : "Здравствуйте!";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Добро пожаловать в Zharnamarket</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      ${greeting} Спасибо, что зарегистрировались. Zharnamarket — маркетплейс, где бизнес размещает рекламные задания, а креаторы берут их в работу.
    </p>
    <div style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div style="margin-bottom: 8px;"><strong>Для бизнеса:</strong> создайте объявление (990 ₸) и получайте отклики от креаторов.</div>
      <div><strong>Для креаторов:</strong> опубликуйте профиль бесплатно и откликайтесь на задания.</div>
    </div>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/cabinet" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Перейти в кабинет
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
      Если у вас есть вопросы — напишите нам в ответ на это письмо.
    </p>
  `;
  await deliver(to, "Добро пожаловать в Zharnamarket", wrapHtml(inner), "Welcome");
}

// ─── Ad lifecycle notifications ─────────────────────────────────────────────

/**
 * Напоминание владельцу: объявление истекает через ~24 часа.
 */
export async function sendAdExpiringEmail(
  to: string,
  params: { adTitle: string; adId: string; expiresAt: Date },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const when = params.expiresAt.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" });
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Объявление скоро истечёт</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Ваше объявление истечёт <strong>${escapeHtml(when)}</strong>. Чтобы сохранить его в ленте — продлите публикацию.
    </p>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 24px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
      ${escapeHtml(params.adTitle)}
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/ads/${params.adId}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть объявление
      </a>
    </div>
  `;
  await deliver(to, `Объявление «${params.adTitle}» истекает через 24 часа`, wrapHtml(inner), "Ad expiring");
}

/**
 * Уведомление: эскроу-бюджет закончился, объявление переведено в budget_exhausted.
 */
export async function sendBudgetExhaustedEmail(
  to: string,
  params: { adTitle: string; adId: string },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Бюджет исчерпан</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      По вашему объявлению закончился эскроу-бюджет. Объявление снято с ленты — пополните бюджет, чтобы вернуть его в работу.
    </p>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 24px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
      ${escapeHtml(params.adTitle)}
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/ads/${params.adId}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Пополнить бюджет
      </a>
    </div>
  `;
  await deliver(to, `Бюджет исчерпан — «${params.adTitle}»`, wrapHtml(inner), "Budget exhausted");
}

// ─── Moderation / creator notifications ─────────────────────────────────────

/**
 * Уведомление креатору: подача одобрена модератором, деньги зачислены на баланс.
 */
export async function sendSubmissionApprovedEmail(
  to: string,
  params: { taskTitle: string; approvedViews: number; payoutAmount: number },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const payoutFmt = params.payoutAmount.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  const viewsFmt = params.approvedViews.toLocaleString("ru-RU");
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Подача одобрена</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Модератор одобрил вашу подачу по заданию:
    </p>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 16px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
      ${escapeHtml(params.taskTitle)}
    </p>
    <div style="padding: 12px 16px; background: #dcfce7; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Засчитано просмотров:</strong> ${escapeHtml(viewsFmt)}</div>
      <div><strong>Зачислено на баланс:</strong> ${escapeHtml(payoutFmt)} ₸</div>
    </div>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/cabinet/balance" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть кошелёк
      </a>
    </div>
  `;
  await deliver(to, `Подача одобрена — «${params.taskTitle}»`, wrapHtml(inner), "Submission approved");
}

/**
 * Уведомление креатору: подача отклонена модератором.
 * `canAppeal` управляет блоком про апелляцию (отключаем для fake_stats/boosted_views).
 */
export async function sendSubmissionRejectedEmail(
  to: string,
  params: {
    taskTitle: string;
    reasonLabel: string;
    comment?: string | null;
    canAppeal: boolean;
    submissionId: string;
  },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const commentBlock = params.comment?.trim()
    ? `<div style="margin-top: 8px;"><strong>Комментарий:</strong> ${escapeHtml(params.comment.trim())}</div>`
    : "";
  const appealBlock = params.canAppeal
    ? `
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
        Если вы считаете, что отклонение ошибочно — подайте апелляцию в течение 48 часов.
      </p>
      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${appUrl}/cabinet/submissions/${params.submissionId}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Открыть подачу
        </a>
      </div>
    `
    : `
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
        Для данной причины отклонения апелляция недоступна.
      </p>
    `;
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Подача отклонена</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Модератор отклонил вашу подачу по заданию:
    </p>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 16px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
      ${escapeHtml(params.taskTitle)}
    </p>
    <div style="padding: 12px 16px; background: #fee2e2; border-radius: 8px; margin-bottom: 16px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Причина:</strong> ${escapeHtml(params.reasonLabel)}</div>
      ${commentBlock}
    </div>
    ${appealBlock}
  `;
  await deliver(to, `Подача отклонена — «${params.taskTitle}»`, wrapHtml(inner), "Submission rejected");
}

/**
 * Уведомление креатору: апелляция рассмотрена.
 * При decision=approved подача возвращается на повторную модерацию.
 */
export async function sendAppealResolvedEmail(
  to: string,
  params: {
    taskTitle: string;
    decision: "approved" | "rejected";
    comment?: string | null;
    submissionId: string;
  },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const title = params.decision === "approved" ? "Апелляция одобрена" : "Апелляция отклонена";
  const message =
    params.decision === "approved"
      ? "Ваша подача возвращена на повторную модерацию. Мы сообщим о решении отдельным письмом."
      : "После рассмотрения модераторами решение об отклонении подачи оставлено в силе.";
  const panelBg = params.decision === "approved" ? "#dcfce7" : "#fee2e2";
  const commentBlock = params.comment?.trim()
    ? `<div style="margin-top: 8px;"><strong>Комментарий модератора:</strong> ${escapeHtml(params.comment.trim())}</div>`
    : "";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">${escapeHtml(title)}</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Задание:
    </p>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 16px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
      ${escapeHtml(params.taskTitle)}
    </p>
    <div style="padding: 12px 16px; background: ${panelBg}; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div>${escapeHtml(message)}</div>
      ${commentBlock}
    </div>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/cabinet/submissions/${params.submissionId}" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть подачу
      </a>
    </div>
  `;
  await deliver(to, `${title} — «${params.taskTitle}»`, wrapHtml(inner), `Appeal ${params.decision}`);
}

/**
 * Уведомление пользователю: аккаунт заблокирован админом.
 */
export async function sendAccountBlockedEmail(to: string): Promise<void> {
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Аккаунт заблокирован</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Ваш аккаунт Zharnamarket был заблокирован администрацией. Вы больше не можете входить в систему и пользоваться сервисом.
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Если вы считаете, что блокировка произошла по ошибке, — ответьте на это письмо с описанием ситуации, и администратор рассмотрит запрос.
    </p>
  `;
  await deliver(to, "Аккаунт заблокирован — Zharnamarket", wrapHtml(inner), "Account blocked");
}

/**
 * Уведомление пользователю: аккаунт разблокирован админом.
 */
export async function sendAccountUnblockedEmail(to: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Аккаунт разблокирован</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      Администрация восстановила доступ к вашему аккаунту. Вы снова можете входить и пользоваться сервисом.
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/auth/login" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Войти в аккаунт
      </a>
    </div>
  `;
  await deliver(to, "Аккаунт разблокирован — Zharnamarket", wrapHtml(inner), "Account unblocked");
}

// ─── Admin alerts ───────────────────────────────────────────────────────────

/**
 * Админ-алерт: пользователь запросил вывод средств.
 */
export async function sendAdminWithdrawalRequestEmail(params: {
  userEmail: string;
  amount: number;
  method: string;
  requestId: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const amountFmt = params.amount.toLocaleString("ru-RU");
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Новая заявка на вывод</h2>
    <div style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Пользователь:</strong> ${escapeHtml(params.userEmail)}</div>
      <div><strong>Сумма:</strong> ${escapeHtml(amountFmt)} ₸</div>
      <div><strong>Способ:</strong> ${escapeHtml(params.method)}</div>
      <div><strong>ID заявки:</strong> ${escapeHtml(params.requestId)}</div>
    </div>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/admin/withdrawals" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть список заявок
      </a>
    </div>
  `;
  await sendAdminEmail(
    `Заявка на вывод ${amountFmt} ₸ (${params.method})`,
    inner,
    "Admin withdrawal",
  );
}

/**
 * Админ-алерт: креатор подал апелляцию на отклонённую подачу.
 */
export async function sendAdminAppealEmail(params: {
  userEmail: string;
  submissionId: string;
  appealId: string;
  reason: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const reasonPreview = params.reason.length > 240 ? params.reason.slice(0, 240) + "…" : params.reason;
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Новая апелляция</h2>
    <div style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 16px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Креатор:</strong> ${escapeHtml(params.userEmail)}</div>
      <div><strong>Submission:</strong> ${escapeHtml(params.submissionId)}</div>
      <div><strong>Appeal ID:</strong> ${escapeHtml(params.appealId)}</div>
    </div>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 24px; padding: 12px 16px; background: #fef3c7; border-radius: 8px; white-space: pre-wrap;">
${escapeHtml(reasonPreview)}
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/admin/appeals" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть апелляции
      </a>
    </div>
  `;
  await sendAdminEmail("Новая апелляция на рассмотрение", inner, "Admin appeal");
}

/**
 * Админ-алерт: пользователь подал жалобу (на объявление, креатора, отзыв и т.п.).
 */
export async function sendAdminReportEmail(params: {
  userEmail: string;
  reportId: string;
  targetType: string;
  targetId: string;
  reason: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const reasonPreview = params.reason.length > 240 ? params.reason.slice(0, 240) + "…" : params.reason;
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Новая жалоба</h2>
    <div style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 16px; font-size: 14px; color: #111827; line-height: 1.7;">
      <div><strong>Отправитель:</strong> ${escapeHtml(params.userEmail)}</div>
      <div><strong>Объект:</strong> ${escapeHtml(params.targetType)} / <code>${escapeHtml(params.targetId)}</code></div>
      <div><strong>Report ID:</strong> ${escapeHtml(params.reportId)}</div>
    </div>
    <p style="color: #111827; font-size: 14px; line-height: 1.6; margin-bottom: 24px; padding: 12px 16px; background: #fef3c7; border-radius: 8px; white-space: pre-wrap;">
${escapeHtml(reasonPreview)}
    </p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/admin/reports" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть жалобы
      </a>
    </div>
  `;
  await sendAdminEmail(`Новая жалоба: ${params.targetType}`, inner, "Admin report");
}

/**
 * Админ-алерт: одна или несколько подач просрочили SLA (24ч модерации).
 */
export async function sendAdminSlaEscalationEmail(params: {
  escalatedCount: number;
  items: Array<{ submissionId: string; taskTitle: string; creatorEmail: string }>;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const list = params.items
    .slice(0, 20)
    .map(
      (it) =>
        `<li><strong>${escapeHtml(it.taskTitle)}</strong> — ${escapeHtml(it.creatorEmail)} (submission <code>${escapeHtml(it.submissionId)}</code>)</li>`,
    )
    .join("");
  const more = params.items.length > 20 ? `<p style="color: #9ca3af; font-size: 12px;">…и ещё ${params.items.length - 20}</p>` : "";
  const inner = `
    <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">SLA: просрочка модерации</h2>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      ${params.escalatedCount} подач(и) перешли в статус <strong>escalated</strong> — модерация не уложилась в 24 часа.
    </p>
    <ul style="color: #111827; font-size: 14px; line-height: 1.6; padding-left: 20px; margin-bottom: 16px;">
      ${list}
    </ul>
    ${more}
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${appUrl}/admin/submissions" style="display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Открыть модерацию
      </a>
    </div>
  `;
  await sendAdminEmail(
    `SLA: ${params.escalatedCount} просроченн${params.escalatedCount === 1 ? "ая подача" : "ых подач"}`,
    inner,
    "Admin SLA",
  );
}
