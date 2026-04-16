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
    // Dev mode: log to console
    console.log("\n[Email] Password reset email (SMTP not configured):");
    console.log(`  To: ${to}`);
    console.log(`  Reset URL: ${resetUrl}`);
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
