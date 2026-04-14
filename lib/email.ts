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

const FROM = () => process.env.SMTP_FROM ?? '"ViralAds" <noreply@viraladds.kz>';

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
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #2563eb); line-height: 48px; color: white; font-weight: bold; font-size: 20px;">V</div>
      </div>
      <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px; text-align: center;">Сброс пароля</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Вы запросили сброс пароля для аккаунта ViralAds. Нажмите кнопку ниже, чтобы установить новый пароль.
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
        ViralAds — маркетплейс для бизнеса и креаторов
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
    subject: "Сброс пароля — ViralAds",
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
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #2563eb); line-height: 48px; color: white; font-weight: bold; font-size: 20px;">V</div>
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
        Код действителен <strong>15 минут</strong>. Если вы не регистрировались на ViralAds — проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">
        ViralAds — маркетплейс для бизнеса и креаторов
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
    subject: `${code} — Код подтверждения ViralAds`,
    html,
  });
}
