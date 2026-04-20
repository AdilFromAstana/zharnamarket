/**
 * Mailbox — in-memory перехватчик вызовов `@/lib/email`.
 *
 * Используется через vi.mock в каждом email-тест-файле:
 *
 *   vi.mock("@/lib/email", async () => {
 *     const m = await import("./_mailbox");
 *     return m.emailModuleMock;
 *   });
 *
 * После этого все контроллеры, дергающие send*Email, будут писать вызов
 * в mailbox вместо отправки через SMTP. Тест проверяет to/params/count.
 */

export interface EmailCall {
  fn: string;
  to: string | undefined;
  args: unknown[];
  at: number;
}

const store: EmailCall[] = [];

function record(fn: string, args: unknown[]): void {
  const to = typeof args[0] === "string" ? args[0] : undefined;
  store.push({ fn, to, args, at: Date.now() });
}

export const mailbox = {
  all(): EmailCall[] {
    return [...store];
  },
  last(fn?: string): EmailCall | undefined {
    if (!fn) return store[store.length - 1];
    for (let i = store.length - 1; i >= 0; i--) {
      if (store[i].fn === fn) return store[i];
    }
    return undefined;
  },
  count(fn?: string): number {
    return fn ? store.filter((c) => c.fn === fn).length : store.length;
  },
  clear(): void {
    store.length = 0;
  },
  /** Ждёт появления письма — для fire-and-forget вызовов. */
  async waitFor(fn: string, timeoutMs = 1000): Promise<EmailCall | undefined> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const m = this.last(fn);
      if (m) return m;
      await new Promise((r) => setTimeout(r, 20));
    }
    return undefined;
  },
};

function mk(name: string) {
  return async (...args: unknown[]): Promise<void> => {
    record(name, args);
  };
}

/**
 * Полная копия экспортов `@/lib/email`. Если в email.ts появится новая
 * функция — добавьте её сюда, иначе импортёр получит `undefined`.
 */
export const emailModuleMock = {
  sendPasswordResetEmail: mk("sendPasswordResetEmail"),
  sendVerificationCode: mk("sendVerificationCode"),
  sendApplicationEmail: mk("sendApplicationEmail"),
  sendNewDeviceLoginEmail: mk("sendNewDeviceLoginEmail"),
  sendPasswordChangedEmail: mk("sendPasswordChangedEmail"),
  sendEmailChangeCode: mk("sendEmailChangeCode"),
  sendPaymentReceiptEmail: mk("sendPaymentReceiptEmail"),
  sendWelcomeEmail: mk("sendWelcomeEmail"),
  sendAdExpiringEmail: mk("sendAdExpiringEmail"),
  sendBudgetExhaustedEmail: mk("sendBudgetExhaustedEmail"),
  sendSubmissionApprovedEmail: mk("sendSubmissionApprovedEmail"),
  sendSubmissionRejectedEmail: mk("sendSubmissionRejectedEmail"),
  sendAppealResolvedEmail: mk("sendAppealResolvedEmail"),
  sendAccountBlockedEmail: mk("sendAccountBlockedEmail"),
  sendAccountUnblockedEmail: mk("sendAccountUnblockedEmail"),
  sendAdminWithdrawalRequestEmail: mk("sendAdminWithdrawalRequestEmail"),
  sendAdminAppealEmail: mk("sendAdminAppealEmail"),
  sendAdminReportEmail: mk("sendAdminReportEmail"),
  sendAdminSlaEscalationEmail: mk("sendAdminSlaEscalationEmail"),
};
